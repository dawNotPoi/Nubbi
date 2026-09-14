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
    <div className={className}>
      <header className="flex items-center gap-2 text-[13px] text-gray-500">
        {header}
      </header>
      <main className="mt-4">{children}</main>
    </div>
  );
};

export default CardWrapper;
