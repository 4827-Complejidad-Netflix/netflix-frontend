import { ApiError } from "@/lib/api";

function describe(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  // fetch lanza TypeError cuando no hay conexión con el servidor.
  if (error instanceof TypeError) {
    return "No se pudo conectar con la API. ¿Está corriendo netflix-backend (uvicorn app.main:app --reload)?";
  }
  return "Ocurrió un error inesperado.";
}

interface Props {
  error: unknown;
  title?: string;
}

export default function ErrorState({ error, title = "No se pudieron cargar los datos" }: Props) {
  return (
    <div className="rounded-md border border-brand/40 bg-brand/10 px-4 py-6 text-center text-sm">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-foreground/70">{describe(error)}</p>
    </div>
  );
}
