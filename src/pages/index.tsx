import React, { useEffect, useRef, useState } from "react";
import { encode } from "@node-libraries/wasm-webp-encoder";
import styled from "./index.module.scss";

export const classNames = (...classNames: (string | undefined | false)[]) =>
  classNames.reduce(
    (a, b, index) => a + (b ? (index ? " " : "") + b : ""),
    ""
  ) as string | undefined;

const Time = () => {
  const [time, setTime] = useState(0);
  useEffect(() => {
    const handle = setInterval(() => setTime((v) => v + 1), 100);
    return () => clearInterval(handle);
  }, []);
  return <div>{time}</div>;
};

const Page = () => {
  const ref = useRef<HTMLInputElement>(null);
  const [isDrag, setDrag] = useState(false);
  const [imageData, setImageData] = useState<string | undefined>();
  const [state, setState] = useState<"idle" | "progress" | "finished">("idle");
  const convertUrl = (data: ArrayBuffer | undefined | null) => {
    if (!data) return undefined;
    return `data:image/webp;base64,` + Buffer.from(data).toString("base64");
  };

  const convertWebp = async (blob: Blob) => {
    if (!blob.type.match(/^image\/(png|jpeg|gif)/)) return null;
    setState("progress");
    const src = await blob
      .arrayBuffer()
      .then(
        (v) => `data:${blob.type};base64,` + Buffer.from(v).toString("base64")
      );
    const img = document.createElement("img");
    img.src = src;
    await new Promise((resolve) => (img.onload = resolve));
    const canvas = document.createElement("canvas");
    [canvas.width, canvas.height] = [img.width, img.height];
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const value = await encode(ctx.getImageData(0, 0, img.width, img.height));
    setState("finished");
    return value;
  };

  useEffect(() => {
    const handle = () => {
      navigator.clipboard.read().then((items) => {
        for (const item of items) {
          item.getType("image/png").then(async (value) => {
            const v = await convertWebp(value);
            setImageData(convertUrl(v));
          });
        }
      });
    };
    addEventListener("paste", handle);
    return () => removeEventListener("paste", handle);
  }, []);
  return (
    <>
      <div>
        <a href="https://github.com/SoraKumo001/next-webp">Source code</a>
      </div>
      <Time />
      <div
        className={classNames(styled.root, isDrag && styled.dragover)}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          ref.current?.click();
          e.stopPropagation();
        }}
        onDragEnter={() => setDrag(true)}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          for (const item of e.dataTransfer.files) {
            convertWebp(item).then((v) => setImageData(convertUrl(v)));
          }
          e.preventDefault();
        }}
      >
        {imageData ? (
          <>
            <span
              className={styled.clear}
              onClick={() => {
                setImageData(undefined);
                setState("idle");
              }}
            >
              ✖
            </span>
            <img
              src={imageData}
              onClick={() => {
                const node = document.createElement("a");
                node.download = "download.webp";
                node.href = imageData;
                node.click();
              }}
            />
          </>
        ) : (
          <>
            {state === "progress" && <div>Conversion in progress.</div>}
            <input
              ref={ref}
              type="file"
              accept=".jpg, .png, .gif"
              onChange={(e) => {
                const blob = e.currentTarget.files?.[0];
                if (blob) {
                  convertWebp(blob).then((v) => setImageData(convertUrl(v)));
                }
              }}
            />
          </>
        )}
      </div>
    </>
  );
};
export default Page;
