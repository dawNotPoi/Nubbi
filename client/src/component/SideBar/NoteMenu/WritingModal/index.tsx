import { newPost, Post, PostWithContent } from "@/api/post";
import { Modal } from "@/component/UI/Dialog";
import { Divider } from "@/component/UI/Divider";
import Popover from "@/component/UI/Popover";
import TiptapEditor from "@/component/editor/Tiptap";
import {
  createPostAtom,
  updatePostContentAtom,
  updatePostPropertiesAtom,
} from "@/store/atom/postAtom";
import { debounceWrapper } from "@/utils/common";
import { FileTextOutlined } from "@ant-design/icons";
import clsx from "clsx";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import { MdOpenInFull } from "react-icons/md";
import { RiAddFill } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import { IconButton } from "../../components";
import { SearchNoteList } from "./SearchNodeList";

const DEFAULT_TITLE = "未命名文档";

export const WrittingModal = ({
  parent,
  onTrigger,
}: {
  parent: Post;
  onTrigger?: () => void;
}) => {
  const [targetNote, setTargetNote] = useState<Post | null>(parent);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [draftPost, setDraftPost] = useState<PostWithContent | null>(null);
  const draftPostRef = useRef<PostWithContent | null>(null);
  const titleRef = useRef("");
  const contentRef = useRef("");
  const { mutate: createPostMutate } = useAtomValue(createPostAtom);
  const [{ mutate: updatePostContent }] = useAtom(updatePostContentAtom);
  const { mutate: updatePostProperties } = useAtomValue(
    updatePostPropertiesAtom,
  );
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);

  useEffect(() => {
    draftPostRef.current = draftPost;
  }, [draftPost]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const resetModal = () => {
    setOpen(false);
    setTargetPickerOpen(false);
    setTitle("");
    setContent("");
    setDraftPost(null);
    setTargetNote(parent);
  };

  const createDraft = (initialValues?: Partial<PostWithContent>) => {
    const post = newPost({
      parentId: targetNote?._id,
      ...initialValues,
    });
    setDraftPost(post);
    createPostMutate(post);
    return post;
  };

  const syncParent = (nextParent: Post) => {
    setTargetNote(nextParent);
    setTargetPickerOpen(false);
    setDraftPost((prev) =>
      prev ? { ...prev, parentId: nextParent._id } : prev,
    );

    if (!draftPostRef.current) return;

    updatePostProperties({
      postId: draftPostRef.current._id,
      properties: { parentId: nextParent._id },
      parentId: draftPostRef.current.parentId ?? undefined,
    });
  };

  const debouncedUpdateTitle = useMemo(
    () =>
      debounceWrapper((postId: string, nextTitle: string, parentId?: string) => {
        updatePostProperties({
          postId,
          properties: { title: nextTitle },
          parentId,
        });
      }, 300),
    [updatePostProperties],
  );

  const debouncedUpdateContent = useMemo(
    () =>
      debounceWrapper((postId: string, nextContent: string) => {
        updatePostContent({ postId, content: nextContent });
      }, 300),
    [updatePostContent],
  );

  const syncTitle = (nextTitle: string) => {
    if (!draftPostRef.current) {
      createDraft({ title: nextTitle, content: contentRef.current });
      return;
    }

    debouncedUpdateTitle(
      draftPostRef.current._id,
      nextTitle,
      draftPostRef.current.parentId ?? undefined,
    );
  };

  const syncContent = (nextContent: string) => {
    if (!draftPostRef.current) {
      createDraft({ title: titleRef.current, content: nextContent });
      return;
    }

    debouncedUpdateContent(draftPostRef.current._id, nextContent);
  };

  const createPostHandler = () => {
    if (draftPost) {
      navigate("note/" + draftPost._id);
      resetModal();
      return;
    }

    const post = newPost({
      title,
      content,
      parentId: targetNote?._id,
    });

    createPostMutate(post, {
      onSuccess: () => {
        navigate("note/" + post._id);
        resetModal();
      },
    });
  };

  const Editor = useMemo(
    () => (
      <TiptapEditor
        defaultValue={content}
        onChange={(value) => {
          setContent(value);
          syncContent(value);
        }}
      />
    ),
    [],
  );

  return (
    <Modal
      open={open}
      className={clsx(
        "h-[80%] min-h-[320px] w-full max-w-3xl md:max-w-4xl lg:max-w-5xl",
        "rounded-2xl border border-neutral-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)]",
      )}
      onCancel={resetModal}
      title={
        <div className="flex items-center justify-start gap-2 text-sm text-neutral-500">
          <IconButton
            onClick={createPostHandler}
            className={clsx(
              "flex size-8 items-center justify-center rounded-md text-neutral-500 transition-colors",
              "hover:bg-neutral-100 hover:text-neutral-700",
            )}
          >
            <MdOpenInFull />
          </IconButton>
          <Divider orientation="vertical" className="mx-1 my-2 h-5" />
          <Popover
            open={targetPickerOpen}
            onClickOutside={() => setTargetPickerOpen(false)}
            className="rounded-xl border border-neutral-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
            trigger={
              <div
                onClick={() => {
                  setTargetPickerOpen((prev) => !prev);
                }}
              >
                <IconButton
                  className={clsx(
                    "flex h-8 items-center gap-2 rounded-md px-2 text-center text-neutral-500 transition-colors",
                    "hover:bg-neutral-100 hover:text-neutral-700",
                  )}
                >
                  <span className="text-neutral-400">Add to</span>
                  <FileTextOutlined className="text-neutral-400" />
                  <span className="max-w-[220px] truncate font-medium text-neutral-900">
                    {targetNote?.title || DEFAULT_TITLE}
                  </span>
                </IconButton>
              </div>
            }
          >
            <SearchNoteList
              selectedId={targetNote?._id}
              onChange={syncParent}
            />
          </Popover>
        </div>
      }
      trigger={
        <RiAddFill
          onClick={() => {
            onTrigger?.();
            setOpen(true);
          }}
          className="size-full"
        />
      }
    >
      <main className="h-full max-h-[70vh] cursor-text overflow-y-auto px-8 py-8 md:px-10">
        <header className="mb-3">
          <input
            value={title}
            onChange={(event) => {
              const nextTitle = event.target.value;
              setTitle(nextTitle);
              syncTitle(nextTitle);
            }}
            className={clsx(
              "w-full border-none bg-transparent py-2 text-3xl font-semibold tracking-tight text-neutral-900 outline-none",
              "placeholder:text-neutral-300",
            )}
            type="text"
            placeholder={DEFAULT_TITLE}
          />
        </header>
        {Editor}
      </main>
    </Modal>
  );
};
