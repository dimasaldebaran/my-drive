import { render, screen } from "@testing-library/react";
import App from "./App";

test("menampilkan judul ruang arsip", () => {
  render(<App />);

  expect(screen.getByText(/Ruang Arsip Dinas/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Folder Dinas/i)[0]).toBeInTheDocument();
  expect(screen.getByText(/Unggah File/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Cari nama dinas/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Cari file/i)).toBeInTheDocument();
});