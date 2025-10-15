import { render, screen } from "@testing-library/react";
import App from "./App";

test("menampilkan judul ruang arsip", () => {
  render(<App />);

  expect(screen.getByText(/Ruang Arsip Dinas/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Folder Dinas/i)[0]).toBeInTheDocument();
  expect(screen.getByText(/Script Siap Salin/i)).toBeInTheDocument();
});