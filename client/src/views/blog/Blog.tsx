import TiptapEditor from "@/component/editor/Tiptap";
import {
  postDetailAtom,
  updatePostContentAtom,
  updatePostPropertiesAtom,
} from "@/store/atom/postAtom";
import { debounceWrapper } from "@/utils/common";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo } from "react";
import "react-markdown-editor-lite/lib/index.css";
import { useParams } from "react-router-dom";
import "./blog.css";
import BlogCard from "./BlogCard";
import BlogMeta from "./BlogMeta";
export default function Blog() {
  const { Id } = useParams();
  const { data, isLoading, refetch } = useAtomValue(postDetailAtom(Id!));
  const [{ mutate: updatePostContent }] = useAtom(updatePostContentAtom);
  const { mutate: updatePostProperties } = useAtomValue(
    updatePostPropertiesAtom
  );
  const debouncedUpdatePost = useCallback(
    debounceWrapper(updatePostContent),
    []
  );
  useEffect(() => {
    refetch();
  }, [Id]);

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
  }, [Id, isLoading, data?.content, data?.updatedAt]);
  if (!Id || !data) return <div>loading</div>;

  return (
    <div className="min-w-[800px]">
      <BlogCard
        data={data}
        onUpdate={(newData) => {
          console.log(newData);

          updatePostProperties({
            postId: Id,
            properties: newData,
            parentId: data.parentId as string,
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
            placeholder="未命名文章"
            defaultValue={data.title}
            onChange={(e) => {
              updatePostProperties({
                postId: Id,
                properties: { title: e.target.value },
                parentId: data.parentId as string,
              });
            }}
          />
          <BlogMeta
            className="mt-4 -z-10"
            data={data}
            onUpdate={(newMeta) => {
              updatePostProperties({
                postId: Id,
                properties: { meta: newMeta },
                parentId: data.parentId as string,
              });
            }}
          />
          {Editor}
        </div>
      </main>
    </div>
  );
}
