import {
    Component
} from 'react';

import {
    AlertTriangle,
    RefreshCw
} from 'lucide-react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            error: null
        };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, informacion) {
        console.error(
            'Error inesperado en la interfaz:',
            error,
            informacion
        );
    }

    render() {
        if (!this.state.error) {
            return this.props.children;
        }

        return (
            <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white">
                <section className="w-full max-w-lg rounded-3xl border border-red-400/25 bg-red-950/40 p-8 text-center shadow-2xl shadow-red-950/40">
                    <AlertTriangle
                        size={48}
                        className="mx-auto text-red-300"
                    />

                    <h1 className="mt-5 text-2xl font-bold">
                        La vista necesita recuperarse
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-slate-300">
                        Ocurrió un error inesperado. La sesión y los datos
                        guardados permanecen protegidos.
                    </p>

                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="mx-auto mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500 px-5 font-bold text-white transition hover:bg-red-400"
                    >
                        <RefreshCw size={18} />
                        Recargar vista
                    </button>
                </section>
            </main>
        );
    }
}

export default ErrorBoundary;
