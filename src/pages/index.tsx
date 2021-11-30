import React, { FC, useEffect, useRef, useState } from "react";
import { encode } from "@node-libraries/wasm-webp-encoder";
import styled from "./index.module.scss";

export const classNames = (...classNames: (string | undefined | false)[]) =>
  classNames.reduce(
    (a, b, index) => a + (b ? (index ? " " : "") + b : ""),
    ""
  ) as string | undefined;

export const convertWebp = async (blob: Blob) => {
  if (!blob.type.match(/^image\/(png|jpeg)/)) return blob;
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
  if (!value) return null;
  return new Blob([value], { type: "image/webp" });
};

const Page = () => {
  const ref = useRef<HTMLInputElement>(null);
  const [isDrag, setDrag] = useState(false);
  const [imageData, setImageData] = useState<string | undefined>();
  const convertUrl = async (blob: Blob | undefined | null) => {
    if (!blob) return undefined;
    return (
      `data:image/webp;base64,` +
      Buffer.from(await blob.arrayBuffer()).toString("base64")
    );
  };
  useEffect(() => {
    const handle = () => {
      navigator.clipboard.read().then((items) => {
        for (const item of items) {
          item.getType("image/png").then(async (value) => {
            const v = await convertWebp(value);
            convertUrl(v).then(setImageData);
          });
        }
      });
    };
    addEventListener("paste", handle);
    return () => removeEventListener("paste", handle);
  }, []);
  return (
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
          convertWebp(item).then((blob) => {
            convertUrl(blob).then(setImageData);
          });
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
          <input
            ref={ref}
            type="file"
            accept=".jpg, .png, .gif"
            onChange={(e) => {
              const blob = e.currentTarget.files?.[0];
              if (blob) {
                convertUrl(blob).then(setImageData);
              }
            }}
          />
        </>
      )}
    </div>
  );
};
export default Page;
