import React, { useCallback, useEffect, useRef, useState } from "react";
import { db, storage } from "./firebase";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
    serverTimestamp,
  where,
} from "firebase/firestore";
import {
  UploadCloud,
  Trash2,
  FileText,
  Image as ImageIcon,
  Loader2,
  Folder,
  Copy,
  Check,
  Info,
} from "lucide-react";

const departments = [
  { id: "dinas-1", name: "Dinas 1" },
  { id: "dinas-2", name: "Dinas 2" },
  { id: "dinas-3", name: "Dinas 3" },
];

const isImage = (name = "") =>
  [".png", ".jpg", ".jpeg", ".gif", ".webp"].some((ext) =>
    name.toLowerCase().endsWith(ext)
  );

const formatDate = (timestamp) => {
  if (!timestamp) return "Baru diunggah";
  try {
    return timestamp.toDate().toLocaleString();
  } catch (error) {
    return "Baru diunggah";
  }
};

export default function App() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [activeFolder, setActiveFolder] = useState(departments[0].id);
  const [copiedFileId, setCopiedFileId] = useState(null);
  const [snippetCopied, setSnippetCopied] = useState(false);
  const inputRef = useRef(null);

  const filesCol = collection(db, "files");

  const getFolderName = useCallback(
    (id) => departments.find((folder) => folder.id === id)?.name ?? id,
    []
  );

  const loadFiles = useCallback(
    async (folderId) => {
      try {
        const constraints = [where("folder", "==", folderId)];
        const q = query(filesCol, ...constraints);
        const snap = await getDocs(q);
        const list = snap.docs
          .map((document) => ({
            id: document.id,
            ...document.data(),
          }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() ?? 0;
            const bTime = b.createdAt?.toMillis?.() ?? 0;
            return bTime - aTime;
          });
        setFiles(list);
      } catch (error) {
        console.error("Load files error:", error);
        setFiles([]);
      }
    },
    [filesCol]
  );

    useEffect(() => {
    loadFiles(activeFolder);
  }, [activeFolder, loadFiles]);

  const handleChooseFile = () => inputRef.current?.click();

  const handleInputChange = async (event) => {
    const file = event.target.files?.[0];
    if (file) await uploadFile(file, activeFolder);
    event.target.value = "";
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) await uploadFile(file, activeFolder);
  };

  const uploadFile = async (file, folderId) => {
    try {
      setUploading(true);
      setProgress(0);

      const safeName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `${folderId}/${safeName}`);
      const task = uploadBytesResumable(storageRef, file);

      task.on(
        "state_changed",
        (snapshot) => {
          const pct = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          setProgress(pct);
        },
        (error) => {
          console.error("Upload error:", error);
          setUploading(false);
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          await addDoc(filesCol, {
            name: file.name,
            url,
            storagePath: task.snapshot.ref.fullPath,
            createdAt: serverTimestamp(),
            size: file.size,
            type: file.type || "application/octet-stream",
            folder: folderId,
          });
          setUploading(false);
          setProgress(0);
          await loadFiles(folderId);
        }
      );
    } catch (error) {
      console.error("Upload failed:", error);
      setUploading(false);
    }
  };

  const deleteFile = async (id, storagePath) => {
    if (!window.confirm("Yakin mau hapus file ini?")) return;
    try {
      await deleteObject(ref(storage, storagePath));
      await deleteDoc(doc(db, "files", id));
      await loadFiles(activeFolder);
    } catch (error) {
      console.error("Delete file error:", error);
    }
  };

  const copyToClipboard = async (value, onSuccess) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      onSuccess();
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const handleCopyFileLink = (file) =>
    copyToClipboard(file.url, () => {
      setCopiedFileId(file.id);
      setTimeout(() => setCopiedFileId(null), 2000);
    });

  const baseOrigin =
    typeof window !== "undefined" ? window.location.origin : "https://example.com";

  const scriptSnippet = `// Contoh script berbagi dokumen
fetch("${baseOrigin}/api/share", {
  method: "POST",
  body: JSON.stringify({
    folder: "${getFolderName(activeFolder)}",
    link: "https://contoh.link/dokumen",
  }),
});`;

  const handleCopySnippet = () =>
    copyToClipboard(scriptSnippet, () => {
      setSnippetCopied(true);
      setTimeout(() => setSnippetCopied(false), 2000);
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 text-slate-800">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8">
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">
            <Folder size={14} /> Pusat Dokumen Dinas
          </span>
          <h1 className="text-3xl font-bold text-slate-900">Ruang Arsip Dinas</h1>
          <p className="text-sm text-slate-600 md:max-w-2xl">
            Simpan dan kelola dokumen setiap dinas dengan rapi. Pilih folder di
            samping untuk melihat file yang dimiliki masing-masing dinas dan bagikan
            tautannya hanya dengan satu klik.
          </p>
        </div>
      </header>
      
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 lg:flex-row">
        <aside className="lg:w-72">
          <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Folder Dinas
            </h2>
            <nav className="flex flex-col gap-2">
              {departments.map((folder) => {
                const isActive = activeFolder === folder.id;
                return (
                  <button
                    key={folder.id}
                    onClick={() => setActiveFolder(folder.id)}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      isActive
                        ? "border-indigo-400 bg-indigo-50 text-indigo-600 shadow-sm"
                        : "border-transparent bg-slate-50 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <Folder size={18} />
                    <span className="font-medium">{folder.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="mt-6 space-y-4 rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-indigo-100 p-2 text-indigo-500">
                <Info size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Panduan Singkat</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-500">
                  <li>Pilih folder dinas sebelum mengunggah berkas.</li>
                  <li>Gunakan tombol Salin Link untuk membagikan dokumen.</li>
                  <li>Hapus file yang sudah tidak diperlukan agar tetap rapi.</li>
                </ul>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-4 text-xs text-slate-600">
              <p className="font-semibold text-indigo-600">Tips:</p>
              <p className="mt-1">
                Pastikan nama file mudah dipahami, misalnya
                <span className="font-medium"> laporan_keuangan_q1.pdf</span> supaya tim cepat menemukan dokumen.
              </p>
            </div>
          </div>
        </aside>

        <section className="flex-1">
          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {getFolderName(activeFolder)}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Unggah dokumen untuk {getFolderName(activeFolder)}. File yang
                    ditambahkan akan langsung tersimpan di folder ini.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={inputRef}
                    className="hidden"
                    onChange={handleInputChange}
                  />
                  <button
                    onClick={handleChooseFile}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <UploadCloud size={18} /> Unggah File
                  </button>
                </div>
              </div>

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`mt-6 rounded-3xl border-2 border-dashed p-6 text-center transition ${
                  dragOver
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-300 bg-slate-50"
                }`}
              >
                <div className="flex flex-col items-center justify-center gap-2 text-slate-600">
                  <UploadCloud className="text-indigo-500" />
                  <p className="text-sm">
                    Seret & lepaskan dokumen ke area ini atau klik tombol untuk
                    memilih dari komputer.
                  </p>
                  <p className="text-xs text-slate-400">
                    Folder aktif: {getFolderName(activeFolder)}
                  </p>
                </div>

                {uploading && (
                  <div className="mt-4 text-left">
                    <div className="mb-1 flex items-center gap-2 text-sm text-slate-600">
                      <Loader2 className="animate-spin" size={16} />
                      Mengunggah… {progress}%
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-indigo-600 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Daftar File</h3>
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {files.length} file
                </span>
              </div>

              {files.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Belum ada file di folder ini. Mulai unggah dokumen untuk {" "}
                  {getFolderName(activeFolder)}.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
                    >
                      <div className="flex items-center justify-center">
                        {isImage(file.name) ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="h-28 w-full max-w-[180px] rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="flex h-28 w-full max-w-[180px] items-center justify-center rounded-lg border bg-slate-50">
                            {file.type?.includes("pdf") ? (
                              <FileText className="text-rose-500" size={36} />
                            ) : (
                              <ImageIcon className="text-slate-400" size={36} />
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-sm font-medium text-slate-900 hover:text-indigo-600"
                          title={file.name}
                        >
                          {file.name}
                        </a>
                        <span className="text-xs text-slate-400">
                          {formatDate(file.createdAt)}
                        </span>
                      </div>

                      <div className="mt-auto flex items-center justify-between">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                          Buka
                        </a>
                        <button
                          onClick={() => handleCopyFileLink(file)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                            copiedFileId === file.id
                              ? "border-indigo-500 bg-indigo-500 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {copiedFileId === file.id ? (
                            <>
                              <Check size={14} /> Tersalin
                            </>
                          ) : (
                            <>
                              <Copy size={14} /> Salin Link
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => deleteFile(file.id, file.storagePath)}
                          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-500"
                        >
                          <Trash2 size={14} /> Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Script Siap Salin</h3>
                  <p className="text-xs text-slate-500">
                    Gunakan contoh script ini untuk membagikan dokumen ke sistem lain.
                  </p>
                </div>
                <button
                  onClick={handleCopySnippet}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    snippetCopied
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-900 text-white hover:bg-slate-700"
                  }`}
                >
                  {snippetCopied ? <Check size={14} /> : <Copy size={14} />}
                  {snippetCopied ? "Script Tersalin" : "Salin Script"}
                </button>
              </div>
              <pre className="rounded-2xl border border-slate-200 bg-slate-900/90 p-4 text-xs text-slate-100">
                <code>{scriptSnippet}</code>
              </pre>
              <p className="mt-3 text-[11px] text-slate-400">
                Sesuaikan <span className="font-semibold text-indigo-300">folder</span> dan
                <span className="font-semibold text-indigo-300"> link</span> sebelum dibagikan.
              </p>
            </div>
          </div>
        </section>
      </main>
      <div className="sr-only" aria-live="polite">
        {copiedFileId ? "Tautan file berhasil disalin" : ""}
        {snippetCopied ? "Script siap digunakan" : ""}
      </div>
    </div>
  );
}