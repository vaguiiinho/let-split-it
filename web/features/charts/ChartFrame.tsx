/**
 * Moldura comum dos gráficos (Server Component): <figure> + título visível, o SVG (ou o estado
 * vazio) e uma tabela sr-only com os mesmos dados para leitores de tela.
 */
export function ChartFrame({
  id,
  title,
  subtitle,
  empty,
  emptyText,
  table,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  empty: boolean;
  emptyText: string;
  table: { columns: [string, string]; rows: [string, string][] };
  children: React.ReactNode;
}) {
  return (
    <figure aria-labelledby={`${id}-title`} className="card flex flex-col">
      <figcaption className="mb-4">
        <h3 id={`${id}-title`} className="text-lg font-extrabold">
          {title}
        </h3>
        {subtitle && <p className="text-sm">{subtitle}</p>}
      </figcaption>
      {empty ? (
        <div className="grid flex-1 place-items-center rounded-xl border-2 border-dashed border-line px-4 py-8 text-center">
          <p className="text-sm">{emptyText}</p>
        </div>
      ) : (
        <>
          {children}
          <table className="sr-only">
            <caption>{title}</caption>
            <thead>
              <tr>
                <th scope="col">{table.columns[0]}</th>
                <th scope="col">{table.columns[1]}</th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map(([label, value], i) => (
                <tr key={i}>
                  <th scope="row">{label}</th>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </figure>
  );
}
