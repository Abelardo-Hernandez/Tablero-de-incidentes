import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

function NotFoundPage() {
    return (
        <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white">
            <div className="text-center">
                <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-400">
                    Error 404
                </p>

                <h1 className="mt-4 text-5xl font-bold">
                    Página no encontrada
                </h1>

                <p className="mt-4 text-slate-400">
                    La dirección que intentaste abrir no existe.
                </p>

                <Link
                    to="/"
                    className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold transition hover:bg-emerald-500"
                >
                    <ArrowLeft size={18} />
                    Volver al sistema
                </Link>
            </div>
        </main>
    );
}

export default NotFoundPage;