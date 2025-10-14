// src/App.js
import React, { useEffect, useRef, useState } from "react";
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
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import {
  UploadCloud,
  Trash2,
  FileText,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";

export default function App() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const filesCol = collection(db, "files");

  // Load files from Firestore (newest first)
  const loadFiles = async () => {
    try {
      const q = query(filesCol, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setFiles(list);
    } catch (e) {
      console.error("Load files error:", e);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  // Helpers
  const isImage = (name = "") =>
    [".png", ".jpg", ".jpeg", ".gif", ".webp"].some((ext) =>
      name.toLowerCase().endsWith(ext)
    );

  const handleChooseFile = () => inputRef.current?.click();

  const handleInputChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
    e.target.value = ""; // reset input agar bisa upload file yg sama lagi
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  };

  const uploadFile = async (file) => {
    try {
      setUploading(true);
      setProgress(0);

      const safeName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `files/${safeName}`);
      const task = uploadBytesResumable(storageRef, file);

      task.on(
        "state_changed",
        (snap) => {
          const pct = Math.round(
            (snap.bytesTransferred / snap.totalBytes) * 100
          );
          setProgress(pct);
        },
        (err) => {
          console.error("Upload error:", err);
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
          });
          setUploading(false);
          setProgress(0);
          await loadFiles();
        }
      );
    } catch (e) {
      console.error("Upload failed:", e);
      setUploading(false);
    }
  };

  const deleteFile = async (id, storagePath) => {
    if (!window.confirm("Yakin mau hapus file ini?")) return;
    try {
      await deleteObject(ref(storage, storagePath));
      await deleteDoc(doc(db, "files", id));
      await loadFiles();
    } catch (e) {
      console.error("Delete error:", e);
      alert("Gagal menghapus file. Cek Console untuk detail.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100">
      {/* Topbar */}
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-indigo-700">
            MyDrive <span className="text-slate-500 font-medium">/ Prototype</span>
          </h1>
          <button
            onClick={handleChooseFile}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition shadow"
          >
            <UploadCloud size={18} />
            Upload
          </button>
          <input
            ref={inputRef}
            type="file"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`mb-6 rounded-2xl border-2 border-dashed p-6 transition ${
            dragOver
              ? "border-indigo-500 bg-indigo-50"
              : "border-slate-300 bg-white"
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <UploadCloud className="text-indigo-500" />
            <p className="text-slate-700">
              <span className="font-semibold">Drag & drop</span> file ke sini, atau{" "}
              <button
                onClick={handleChooseFile}
                className="text-indigo-600 underline underline-offset-4"
              >
                pilih dari komputer
              </button>
              .
            </p>
            <p className="text-xs text-slate-500">Mendukung gambar, PDF, dan lainnya.</p>
          </div>

          {/* Progress */}
          {uploading && (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                <Loader2 className="animate-spin" size={16} />
                Uploading… {progress}%
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

        {/* Files grid */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">File kamu</h2>
            <span className="text-xs text-slate-500">
              {files.length} item
            </span>
          </div>

          {files.length === 0 ? (
            <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
              Belum ada file. Ayo upload file 🚀
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="group rounded-2xl border bg-white p-4 shadow-sm hover:shadow transition"
                >
                  {/* Preview */}
                  <div className="mb-3 flex items-center justify-center">
                    {isImage(f.name) ? (
                      <img
                        src={f.url}
                        alt={f.name}
                        className="h-28 w-full max-w-[180px] object-cover rounded-lg border"
                      />
                    ) : (
                      <div className="h-28 w-full max-w-[180px] flex items-center justify-center rounded-lg border bg-slate-50">
                        {f.type?.includes("pdf") ? (
                          <FileText className="text-rose-500" size={36} />
                        ) : (
                          <ImageIcon className="text-slate-400" size={36} />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-medium text-slate-800 hover:text-indigo-600"
                    title={f.name}
                  >
                    {f.name}
                  </a>

                  {/* Meta */}
                  <div className="mt-1 text-xs text-slate-500">
                    {f.createdAt?.toDate
                      ? f.createdAt.toDate().toLocaleString()
                      : "Baru diunggah"}
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center justify-between">
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg px-3 py-1.5 text-sm border hover:bg-slate-50"
                    >
                      Buka
                    </a>
                    <button
                      onClick={() => deleteFile(f.id, f.storagePath)}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-white bg-rose-600 hover:bg-rose-700"
                    >
                      <Trash2 size={16} />
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
