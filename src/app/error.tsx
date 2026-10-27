"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>Ops, demos uma tropeçadinha.</h1>
      <p>
        O Pet Namora não conseguiu carregar agora. Tente de novo daqui a
        pouquinho.
      </p>
      <button className="primary-button" onClick={reset}>
        Tentar de novo
      </button>
    </main>
  );
}
