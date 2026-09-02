type Props = {
  title: string;
  description: string;
};

export function AreaPlaceholder({ title, description }: Props) {
  return (
    <>
      <h1>{title}</h1>
      <p>{description}</p>
      <p role="status">Nenhuma operação disponível nesta área ainda.</p>
    </>
  );
}
