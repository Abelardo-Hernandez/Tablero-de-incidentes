function PlaceholderPage({
    titulo,
    descripcion
}) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-slate-950">
                {titulo}
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-slate-500">
                {descripcion}
            </p>
        </section>
    );
}

export default PlaceholderPage;