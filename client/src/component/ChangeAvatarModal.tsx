import { imgToGitCloud } from "@/api/file";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { captureAccountScope, isAccountScopeCurrent } from "@/features/auth/model/account-scope";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState, type ReactElement } from "react";

type ChangeAvatarModalProps = {
  open: boolean;
  currentImage?: string;
  onClose: () => void;
  onConfirm: (url: string) => Promise<{ success: boolean; error?: { message?: string } }>;
};

/**
 * 选择本地图片或链接，确认后才更新头像。
 * @param props 弹窗状态、当前头像和更新回调。
 * @returns 头像更换弹窗。
 */
export default function ChangeAvatarModal({ open, currentImage, onClose, onConfirm }: ChangeAvatarModalProps): ReactElement {
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!open) { setFile(null); setLinkUrl(""); setMode("upload"); }
  }, [open]);

  /** 上传结束后只允许原账号继续保存，防止异步上传跨越账号切换。 */
  const handleConfirm = async (): Promise<void> => {
    if (uploading) return;
    const scope = captureAccountScope();
    if (!scope) return;
    setUploading(true);
    try {
      const url = file ? await imgToGitCloud(file) : linkUrl.trim();
      if (!isAccountScopeCurrent(scope)) return;
      if (!url) { toast.warning("请选择图片或粘贴图片链接"); return; }
      const result = await onConfirm(url);
      if (!isAccountScopeCurrent(scope)) return;
      if (result.success) { toast.success("头像更换成功"); onClose(); }
      else toast.error(result.error?.message || "头像更换失败");
    } catch {
      if (isAccountScopeCurrent(scope)) toast.error("头像更换失败，请稍后重试");
    } finally { setUploading(false); }
  };

  return <Modal title="更换头像" open={open} onCancel={onClose} confirmLoading={uploading} maskClosable={!uploading} showClose={!uploading} footer={<div className="mt-5 flex justify-end gap-2">
    <Button className="max-md:h-11" disabled={uploading} onClick={onClose}>取消</Button>
    <Button className="max-md:h-11" variant="primary" loading={uploading} disabled={!file && !linkUrl.trim()} onClick={() => void handleConfirm()}>确认更换</Button>
  </div>}>
    <div className="mb-4 flex justify-center"><img src={currentImage || "/default.jpg"} alt="当前头像" className="size-16 rounded-full border border-border-row object-cover" /></div>
    <fieldset disabled={uploading} className="space-y-4">
      <legend className="sr-only">头像来源</legend>
      <div className="flex gap-4 text-sm">{([{ value: "upload", label: "上传图片" }, { value: "link", label: "粘贴链接" }] as const).map(({ value, label }) => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2">
        <input type="radio" name="avatar-source" value={value} checked={mode === value} onChange={() => { setMode(value); setFile(null); setLinkUrl(""); }} />{label}
      </label>)}</div>
      {mode === "upload" ? <div className="flex flex-col items-center gap-3">
        <input ref={inputRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="选择头像图片" onChange={(event) => {
          const selected = event.target.files?.[0];
          event.target.value = "";
          if (!selected) return;
          if (!selected.type.startsWith("image/")) { toast.error("请选择图片文件"); return; }
          if (selected.size >= 5 * 1024 * 1024) { toast.error("图片大小不能超过 5MB"); return; }
          setFile(selected);
        }} />
        <Button variant="outline" className="h-auto w-full flex-col gap-3 border-dashed p-6" onClick={() => inputRef.current?.click()}>
          {previewUrl ? <img src={previewUrl} alt="头像预览" className="size-24 rounded-full object-cover" /> : <span className="grid size-24 place-items-center rounded-full bg-bg-hover"><Plus className="size-6 text-text-muted" /></span>}
          <span className="max-w-full whitespace-normal break-all text-sm text-text-muted">{file?.name || "点击选择图片（最大 5MB）"}</span>
        </Button>
      </div> : <div className="space-y-3">
        <Input aria-label="图片链接" className="pl-3 max-md:h-11" placeholder="粘贴图片链接（https://...）" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} />
        {linkUrl.trim() && <img key={linkUrl.trim()} src={linkUrl.trim()} alt="链接预览" className="size-20 rounded-full border border-border-row object-cover" />}
      </div>}
    </fieldset>
  </Modal>;
}
