/**
 * 统一首页内容区标题与内容间距。
 * @param props 区域标题、内容和外层样式。
 * @returns 首页内容区容器。
 */
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
      <header className="flex items-center gap-2 text-[15px] font-semibold text-text-primary md:text-base">
        {header}
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
};

export default CardWrapper;
