import TiptapEditor from "@/component/editor/Tiptap";
import {
  postDetailAtom,
  updatePostContentAtom,
  updatePostPropertiesAtom,
} from "@/store/atom/postAtom";
import { debounceWrapper } from "@/utils/common";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import "react-markdown-editor-lite/lib/index.css";
import { useParams } from "react-router-dom";
import "./blog.css";
import BlogCard from "./BlogCard";
import BlogMeta from "./BlogMeta";

const DEFAULT_TITLE = "未命名文档";

function BlogSkeleton() {
  return (
    <div className="min-w-[800px] animate-pulse">
      <div className="mx-6 mt-6 h-40 rounded-2xl bg-neutral-100" />
      <main className="mt-10 w-full items-center">
        <div className="mx-auto w-[50%] min-w-[600px]">
          <div className="h-12 w-2/3 rounded-lg bg-neutral-100" />
          <div className="mt-5 flex gap-3">
            <div className="h-8 w-24 rounded-md bg-neutral-100" />
            <div className="h-8 w-28 rounded-md bg-neutral-100" />
            <div className="h-8 w-20 rounded-md bg-neutral-100" />
          </div>
          <div className="mt-10 space-y-4">
            <div className="h-4 w-full rounded bg-neutral-100" />
            <div className="h-4 w-[92%] rounded bg-neutral-100" />
            <div className="h-4 w-[96%] rounded bg-neutral-100" />
            <div className="h-4 w-[78%] rounded bg-neutral-100" />
            <div className="h-4 w-[88%] rounded bg-neutral-100" />
            <div className="h-4 w-[70%] rounded bg-neutral-100" />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Blog() {
  const { Id } = useParams();
  const { data, isLoading, refetch } = useAtomValue(postDetailAtom(Id!));
  const [{ mutate: updatePostContent }] = useAtom(updatePostContentAtom);
  const { mutate: updatePostProperties } = useAtomValue(
    updatePostPropertiesAtom,
  );
  const [title, setTitle] = useState("");

  const debouncedUpdatePost = useCallback(debounceWrapper(updatePostContent), []);
  const debouncedUpdateTitle = useMemo(
    () =>
      debounceWrapper((nextTitle: string, parentId?: string | null) => {
        if (!Id) return;
        updatePostProperties({
          postId: Id,
          properties: { title: nextTitle },
          parentId: parentId ?? undefined,
        });
      }, 300),
    [Id, updatePostProperties],
  );

  useEffect(() => {
    refetch();
  }, [Id, refetch]);

  useEffect(() => {
    setTitle(data?.title ?? "");
  }, [Id, data?.title]);

  const Editor = useMemo(() => {
    if (isLoading || !Id || !data) return null;
    return (
      <TiptapEditor
        key={`${Id}:${data.updatedAt ?? ""}:${data.content?.length ?? 0}`}
        defaultValue={data.content}
        onChange={(markdown) => {
          debouncedUpdatePost({ postId: Id, content: markdown });
        }}
      />
    );
  }, [Id, isLoading, data?.content, data?.updatedAt, debouncedUpdatePost, data]);

  if (!Id || isLoading || !data) return <BlogSkeleton />;

  return (
    <div className="min-w-[800px]">
      <BlogCard
        data={data}
        onUpdate={(newData) => {
          updatePostProperties({
            postId: Id,
            properties: newData,
            parentId: data.parentId ?? undefined,
          });
        }}
      />
      <main className=" w-full mt-10 items-center">
        <div
          key={`${Id}:${data.updatedAt ?? ""}:${data.content?.length ?? 0}`}
          className="mx-auto w-[50%] min-w-[600px]"
        >
          <input
            className="outline-none text-4xl w-full px-2 font-extrabold"
            placeholder={DEFAULT_TITLE}
            value={title}
            onChange={(e) => {
              const nextTitle = e.target.value;
              setTitle(nextTitle);
              debouncedUpdateTitle(nextTitle, data.parentId);
            }}
          />
          <BlogMeta
            className="mt-4 -z-10"
            data={data}
            onUpdate={(newMeta) => {
              updatePostProperties({
                postId: Id,
                properties: { meta: newMeta },
                parentId: data.parentId ?? undefined,
              });
            }}
          />
          {Editor}
        </div>
      </main>
    </div>
  );
}
