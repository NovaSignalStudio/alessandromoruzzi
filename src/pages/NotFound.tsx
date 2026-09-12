import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-6 text-center">
      <span className="eyebrow">Errore 404</span>
      <h1 className="text-5xl text-text-primary md:text-7xl">
        Fotogramma <span className="font-display italic">non sviluppato</span>
      </h1>
      <p className="max-w-sm text-sm text-muted">
        La pagina che cerchi non esiste o è stata spostata in archivio.
      </p>
      <Link
        to="/"
        className="rounded-full border border-stroke px-7 py-3.5 text-sm text-text-primary transition-colors hover:bg-surface"
      >
        Torna alla home
      </Link>
    </div>
  );
}
