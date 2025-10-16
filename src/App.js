  import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
  } from "react";
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
    Search,
    ShieldCheck,
    ClipboardList,
    AlertCircle,
    CheckCircle2,
  } from "lucide-react";

  const departmentNames = [
  "DAMKAR",
  "DINSOS",
  "DUKCAPIL",
  "DISKOMINFO",
  "DISDIKBUD",
  "Kantor Camat Kelapa",
  "SEKDA",
  "Dinas PUPR",
  "DPRKP",
  "DLHK",
  "DISHUB",
  "INSPEKTORAT",
  "BAPPEDA",
  "BALITBANGDA",
  "Kantor Camat Oebobo",
  "DISPUSIP",
  "DINKOPUKM",
  "DPMPTST",
  "DISPERINDAG",
  "DKP",
  "BKAD",
  "BKPPD",
  "Kantor Camat Maulafa",
  "DINKES",
  "DISNAKERTRANS",
  "DP3A",
  "DISTANPAN",
  "DPPKB",
  "DISPORA",
  "DISPAR",
  "Kantor Camat Kota Raja",
  "Sekretariat DPRD",
  "BAPENDA",
  "SATPOL PP",
  "RSUD SK LERIK",
  "DISPERTA",
  "BADAN KESBANGPOL",
  "BPBD",
  "Kantor Camat Alak",
];

  const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const departments = departmentNames.map((name) => ({
    id: slugify(name),
    name,
  }));

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
    const [searchTerm, setSearchTerm] = useState("");
    const [folderSearch, setFolderSearch] = useState("");
    const [showCover, setShowCover] = useState(true);
    const [followUps, setFollowUps] = useState([]);
    const [followUpForm, setFollowUpForm] = useState({
      title: "",
      responsible: "",
      dueDate: "",
      notes: "",
    });
    const [followUpError, setFollowUpError] = useState("")
    const inputRef = useRef(null);

    const filesCol = collection(db, "files");

    const getFolderName = useCallback(
      (id) => departments.find((folder) => folder.id === id)?.name ?? id,
      []
    );;

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

   useEffect(() => {
    setSearchTerm("");
  }, [activeFolder]);

  const filteredFolders = useMemo(() => {
    const term = folderSearch.trim().toLowerCase();
    if (!term) return departments;
    return departments.filter((folder) =>
      folder.name.toLowerCase().includes(term)
    );
  }, [folderSearch]);

  const filteredFiles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return files;
    return files.filter((file) => file.name?.toLowerCase().includes(term));
  }, [files, searchTerm]);

  const fileCountLabel = searchTerm
    ? `${filteredFiles.length} dari ${files.length} file`
    : `${files.length} file`;

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

      const handleFollowUpChange = (field) => (event) => {
    const value = event.target.value;
    setFollowUpForm((prev) => ({ ...prev, [field]: value }));
    if (followUpError) {
      setFollowUpError("");
    }
  };

  const formatFollowUpDueDate = (value) => {
    if (!value) return "Tidak ada batas waktu";
    try {
      return new Date(value + "T00:00:00").toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (error) {
      return value;
    }
  };

  const handleAddFollowUp = (event) => {
    event.preventDefault();
    if (!followUpForm.title.trim()) {
      setFollowUpError("Judul tindak lanjut wajib diisi.");
      return;
    }

    const newFollowUp = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: followUpForm.title.trim(),
      responsible: followUpForm.responsible.trim(),
      dueDate: followUpForm.dueDate,
      notes: followUpForm.notes.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    setFollowUps((prev) => [newFollowUp, ...prev]);
    setFollowUpForm({ title: "", responsible: "", dueDate: "", notes: "" });
    setFollowUpError("");
  };

  const toggleFollowUpStatus = (id) => {
    setFollowUps((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const deleteFollowUp = (id) => {
    setFollowUps((prev) => prev.filter((item) => item.id !== id));
  };

  if (showCover) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-sky-700 via-indigo-700 to-blue-900 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22),_transparent_55%)]" />
        <div className="pointer-events-none absolute -top-32 -left-32 h-72 w-72 rounded-full bg-sky-400/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-10 h-80 w-80 rounded-full bg-indigo-500/40 blur-3xl" />
        <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-12 px-6 text-center">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.6em] text-sky-100/80">
              Inspektorat Daerah Kota Kupang
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow md:text-5xl">
              Sistem Pengawasan Terpadu dan Terukur
            </h1>
            <p className="text-base text-sky-100 md:text-lg">
              Tingkatkan pengawasan internal dengan portal terpadu untuk memantau
              dokumen, tindak lanjut, dan kolaborasi antar bidang.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-10 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex h-56 w-56 items-center justify-center overflow-hidden rounded-full border-4 border-white/40 bg-white/10 backdrop-blur-xl shadow-2xl">
              <div className="flex h-44 w-44 items-center justify-center rounded-full bg-white/90 p-6 shadow-xl">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/4/49/Lambang_Kota_Kupang.png"
                  alt="Lambang Kota Kupang"
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          <div className="grid w-full gap-4 text-left sm:grid-cols-2">
            <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <div className="mb-3 inline-flex items-center justify-center rounded-full bg-sky-500/80 p-2">
                <ShieldCheck size={22} />
              </div>
              <h2 className="text-lg font-semibold text-white">Pengawasan Progresif</h2>
              <p className="mt-2 text-sm text-sky-100/80">
                Monitor tindak lanjut dan laporkan perkembangan secara real-time.
              </p>
            </div>
            <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <div className="mb-3 inline-flex items-center justify-center rounded-full bg-rose-500/80 p-2">
                <ClipboardList size={22} />
              </div>
              <h2 className="text-lg font-semibold text-white">Pusat Dokumen</h2>
              <p className="mt-2 text-sm text-sky-100/80">
                Simpan arsip pemeriksaan dan rekomendasi dalam satu repositori.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCover(false)}
            className="group inline-flex flex-col items-center gap-1 rounded-full border border-white/30 bg-white/90 px-10 py-4 text-sky-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-white"
          >
            <span className="text-lg font-semibold tracking-wide">
              SIPATUH
            </span>
            <span className="text-xs font-medium text-slate-500">
              Sistem Pengawasan Terpadu dan Terukur
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-white text-slate-800">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-indigo-100/80 via-white to-transparent" />
      <header className="relative border-b border-indigo-100/60 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-10">
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600 shadow-sm">
            <Folder size={14} /> Pusat Dokumen Dinas
          </span>
          <h1 className="text-4xl font-bold text-slate-900">Sistem Pengawasan Terpadu dan Terukur</h1>
          <p className="text-sm text-slate-600 md:max-w-2xl">
            Simpan dan kelola dokumen setiap dinas dengan rapi. Pilih folder di
            samping untuk melihat file yang dimiliki masing-masing dinas dan bagikan
            tautannya hanya dengan satu klik.
          </p>
        </div>
      </header>
      
      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 lg:flex-row">
        <aside className="lg:w-72">
          <div className="rounded-3xl border border-indigo-100/80 bg-white p-6 shadow-lg shadow-indigo-100/40">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Folder Dinas
            </h2>
            <label className="relative mt-3 block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="search"
                value={folderSearch}
                onChange={(event) => setFolderSearch(event.target.value)}
                placeholder="Cari nama dinas…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
              <nav className="flex flex-col gap-2">
                {filteredFolders.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                    Tidak ada dinas dengan nama "{folderSearch}".
                  </p>
                ) : (
                  filteredFolders.map((folder) => {
                    const isActive = activeFolder === folder.id;
                    return (
                      <button
                        key={folder.id}
                        onClick={() => setActiveFolder(folder.id)}
                        className={`group flex items-center gap-4 rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                          isActive
                            ? "border-indigo-300 bg-indigo-50 text-indigo-600 shadow-sm"
                            : "border-transparent bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white"
                        }`}
                      >
                        <span
                          className={`flex h-12 w-12 items-center justify-center rounded-xl border text-indigo-500 transition ${
                            isActive
                              ? "border-indigo-200 bg-white shadow"
                              : "border-slate-200 bg-slate-50 group-hover:border-indigo-200 group-hover:bg-indigo-50"
                          }`}
                        >
                          <Folder size={22} />
                        </span>
                        <span className="font-medium leading-snug">{folder.name}</span>
                      </button>
                    );
                  })
                )}
              </nav>
            </div>
          </div>
          <div className="mt-6 space-y-4 rounded-3xl border border-indigo-100/80 bg-white p-6 shadow-lg shadow-indigo-100/40">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-indigo-100 p-2 text-indigo-500 shadow-inner">
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
            <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/70 p-4 text-xs text-slate-600">
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
            <div className="rounded-3xl border border-indigo-100/80 bg-white p-6 shadow-lg shadow-indigo-100/40">
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
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-300/60 transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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

                        <div className="rounded-3xl border border-indigo-100/80 bg-white p-6 shadow-lg shadow-indigo-100/40">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">E-Tindak Lanjut</h2>
                  <p className="text-sm text-slate-500">
                    Catat tindak lanjut hasil pemeriksaan dan pantau status penyelesaiannya bersama tim.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleAddFollowUp}
                className="mt-6 grid gap-4 sm:grid-cols-2"
              >
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Judul Tindak Lanjut
                  </span>
                  <input
                    type="text"
                    value={followUpForm.title}
                    onChange={handleFollowUpChange("title")}
                    placeholder="Contoh: Evaluasi SOP Pelayanan"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Penanggung Jawab
                  </span>
                  <input
                    type="text"
                    value={followUpForm.responsible}
                    onChange={handleFollowUpChange("responsible")}
                    placeholder="Nama bidang atau pejabat"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Batas Waktu
                  </span>
                  <input
                    type="date"
                    value={followUpForm.dueDate}
                    onChange={handleFollowUpChange("dueDate")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="flex flex-col gap-2 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Catatan / Rincian Aksi
                  </span>
                  <textarea
                    value={followUpForm.notes}
                    onChange={handleFollowUpChange("notes")}
                    rows={3}
                    placeholder="Catat langkah tindak lanjut, kebutuhan dukungan, atau progres terbaru."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <div className="sm:col-span-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-rose-500">{followUpError}</div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 self-end rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-300/60 transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <ClipboardList size={18} /> Simpan Tindak Lanjut
                  </button>
                </div>
              </form>

              <div className="mt-6 space-y-4">
                {followUps.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    Belum ada catatan tindak lanjut. Tambahkan rencana aksi untuk setiap rekomendasi pemeriksaan.
                  </div>
                ) : (
                  followUps.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {item.completed ? (
                            <CheckCircle2 className="text-emerald-500" size={18} />
                          ) : (
                            <AlertCircle className="text-amber-500" size={18} />
                          )}
                          <h3 className="text-sm font-semibold text-slate-800">
                            {item.title}
                          </h3>
                        </div>
                        <div className="grid gap-1 text-xs text-slate-500">
                          {item.responsible && (
                            <p>
                              <span className="font-medium text-slate-600">Penanggung jawab:</span> {item.responsible}
                            </p>
                          )}
                          <p>
                            <span className="font-medium text-slate-600">Batas waktu:</span> {formatFollowUpDueDate(item.dueDate)}
                          </p>
                          {item.notes && <p className="whitespace-pre-wrap">{item.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-start">
                        <button
                          type="button"
                          onClick={() => toggleFollowUpStatus(item.id)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                            item.completed
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                              : "border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50"
                          }`}
                        >
                          {item.completed ? "Buka Kembali" : "Tandai Selesai"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteFollowUp(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-500"
                        >
                          <Trash2 size={14} /> Hapus
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-indigo-100/80 bg-white p-6 shadow-lg shadow-indigo-100/40">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Daftar File</h3>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <label className="relative flex items-center">
                    <Search className="pointer-events-none absolute left-3 text-slate-400" size={16} />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Cari file…"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </label>
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {fileCountLabel}
                  </span>
                </div>
              </div>

              {files.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Belum ada file di folder ini. Mulai unggah dokumen untuk {" "}
                  {getFolderName(activeFolder)}.
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/70 p-8 text-center text-sm text-indigo-600">
                  Tidak ada file yang cocok dengan pencarian "{searchTerm}".
                </div>  
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className="group flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg"
                    >
                      <div className="flex items-center justify-center">
                        {isImage(file.name) ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="h-28 w-full max-w-[180px] rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="flex h-32 w-full max-w-[200px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">
                            {file.type?.includes("pdf") ? (
                              <FileText className="text-rose-500" size={36} />
                            ) : (
                              <ImageIcon size={36} />
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

          </div>
        </section>
      </main>
      <div className="sr-only" aria-live="polite">
        {copiedFileId ? "Tautan file berhasil disalin" : ""}
      </div>
    </div>
  );
}