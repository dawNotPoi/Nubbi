import "./blog.css";
// import style manually
import "react-markdown-editor-lite/lib/index.css";
import { useParams } from "react-router-dom";

import { useAtomValue } from "jotai";
import { useCallback, useEffect } from "react";

import CustomEditor from "@/component/editor/yoopta/YooptaEditor";
import {
  postDetailAtom,
  updatePostContentAtom,
  updatePostPropertiesAtom,
} from "@/store/atom/postAtom";
import { debounceWrapper } from "@/utils/common";
import BlogCard from "./BlogCard";
import BlogMeta from "./BlogMeta";

export default function Blog() {
  const { Id } = useParams();

  const { data, isLoading, refetch } = useAtomValue(postDetailAtom(Id!));
  const { mutate: updatePostContent } = useAtomValue(updatePostContentAtom);
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
  if (!Id || !data || isLoading) return <div>loading</div>;
  return (
    <>
      <BlogCard
        data={data}
        onUpdate={(newData) => {
          updatePostProperties({
            postId: Id,
            properties: newData,
            parentId: data.parentId as string,
          });
        }}
      />
      <main className=" w-full mt-10 items-center">
        <div key={Id} className="mx-auto w-[50%] min-w-[600px]">
          <input
            className="outline-none text-4xl w-full font-extrabold"
            placeholder="请输入标题"

            // value={cardData.title}
            // onChange={(e) => {
            //   updatePost({ title: e.target.value });
            // }}
          />
          <BlogMeta
            className="mt-4"
            data={data}
            onUpdate={(newData) => {
              updatePostProperties({
                postId: Id,
                properties: newData,
                parentId: data.parentId as string,
              });
            }}
          />
          {data && (
            <div>
              <CustomEditor
                defaultValue={data.content}
                onChange={(content) => {
                  debouncedUpdatePost({ postId: Id, content: content });
                }}
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
