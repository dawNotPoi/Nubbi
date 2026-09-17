"""一次性导入经人工确认的品牌图片；哈希不匹配时禁止写入。"""
import base64
import hashlib
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen


def main() -> None:
    """读取固定清单，校验全部分块与成品后写入品牌资产。"""
    repository = os.environ["GITHUB_REPOSITORY"]
    if repository != "dawNotPoi/Nubbi":
        raise RuntimeError("禁止写入非目标项目")
    manifest = json.loads(Path(".github/scripts/brand-import-manifest.json").read_text())
    allowed = {"client/public/brand/mascot.webp", "client/public/brand/wordmark.webp", "client/public/brand/auth-scene.webp"}
    prepared: dict[Path, bytes] = {}
    for asset in manifest["assets"]:
        if asset["path"] not in allowed:
            raise RuntimeError("资产路径不在允许范围内")
        parts = []
        for sha in asset["chunks"]:
            request = Request(f"https://api.github.com/repos/{repository}/git/blobs/{sha}", headers={
                "Authorization": f"Bearer {os.environ['GH_TOKEN']}",
                "Accept": "application/vnd.github+json", "User-Agent": "nubbi-brand-import",
            })
            with urlopen(request, timeout=30) as response:
                result = json.load(response)
            part = base64.b64decode(result["content"])
            actual = hashlib.sha1(f"blob {len(part)}\0".encode() + part).hexdigest()
            if actual != sha:
                raise RuntimeError(f"分块校验失败: {sha}")
            parts.append(part)
        data = b"".join(parts)
        if len(data) != asset["size"] or hashlib.sha256(data).hexdigest() != asset["sha256"]:
            raise RuntimeError(f"完整图片校验失败: {asset['path']}")
        if data[:4] != b"RIFF" or data[8:12] != b"WEBP" or int.from_bytes(data[4:8], "little") + 8 != len(data):
            raise RuntimeError("图片容器不完整")
        prepared[Path(asset["path"])] = data
    for path, data in prepared.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        print(f"Verified {path}: {len(data)} bytes; SHA256 {hashlib.sha256(data).hexdigest()}")
    log = Path("docs/changes/2026-09-17.md")
    with log.open("a", encoding="utf-8") as stream:
        stream.write("\n## 品牌资源导入\n\n**提交者**: github-actions[bot]\n**变更文件**: client/public/brand/{mascot,wordmark,auth-scene}.webp\n**Review 结果**: 分块 Git SHA、成品 SHA256、字节数与 WebP 容器校验通过；本地已检查压缩图像。\n**变更摘要**: 使用用户确认的高光眼便签精灵与登录插画，不重绘 Logo，不修改认证业务。\n")


if __name__ == "__main__":
    main()
