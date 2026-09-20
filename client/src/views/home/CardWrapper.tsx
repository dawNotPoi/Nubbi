const CardWrapper = ({
  header,
  children,
  className,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
  className?: string;
}) => {
  return (
    <section className={className}>
      <header className="flex items-center gap-2 text-[13px] font-medium text-text-muted">
        {header}
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
};

export default CardWrapper;
