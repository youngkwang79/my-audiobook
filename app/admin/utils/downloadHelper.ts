export async function downloadBase64Parts(
  parts: { partNum: number; base64: string }[],
  workId: string,
  episodeId: string,
  title: string,
  dirHandle?: any
) {
  if (!parts || parts.length === 0) return;

  const epNum = Number(episodeId);
  const folder = isNaN(epNum) ? String(episodeId) : String(epNum).padStart(3, "0");

  // Verify and request write permission on the directory if provided
  if (dirHandle) {
    try {
      const opts = { mode: "readwrite" as const };
      if ((await dirHandle.queryPermission(opts)) !== "granted") {
        const permission = await dirHandle.requestPermission(opts);
        if (permission !== "granted") {
          console.warn("Write permission to directory denied by user.");
          dirHandle = null; // fallback to normal download if permission denied
        }
      }
    } catch (permErr) {
      console.error("Error querying/requesting directory permission:", permErr);
      dirHandle = null; // fallback
    }
  }

  for (const part of parts) {
    try {
      const partPadded = String(part.partNum).padStart(2, "0");
      
      // Base64 -> Binary Blob
      const binaryString = window.atob(part.base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: "audio/mpeg" });
      const safeWorkId = workId.replace(/[^a-zA-Z0-9가-힣_\- ]/g, "");
      const fileName = `${safeWorkId}_${folder}_${partPadded}.mp3`;

      if (dirHandle) {
        try {
          const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (writeErr) {
          console.error("Direct write failed, falling back to anchor download:", writeErr);
          triggerAnchorDownload(blob, fileName);
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
      } else {
        triggerAnchorDownload(blob, fileName);
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    } catch (err) {
      console.error(`Error downloading part ${part.partNum}:`, err);
    }
  }
}

function triggerAnchorDownload(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
