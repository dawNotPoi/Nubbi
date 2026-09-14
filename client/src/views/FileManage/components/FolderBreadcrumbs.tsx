import { breadcrumbsAtom } from "@/store/atom/FileAtom";
import { useAtomValue, useSetAtom } from "jotai";
import { ChevronRightIcon } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  buildFilePath,
  isSameCrumbs,
  parseSplatToCrumbs,
  persistBreadcrumbNames,
} from "../routePath";

const FolderBreadcrumbs = () => {
  const navigate = useNavigate();
  const params = useParams();
  const splat = params["*"] ?? "";
  const items = useAtomValue(breadcrumbsAtom);
  const setCrumbs = useSetAtom(breadcrumbsAtom);

  useEffect(() => {
    const nextCrumbs = parseSplatToCrumbs(splat);
    setCrumbs((prev) => (isSameCrumbs(prev, nextCrumbs) ? prev : nextCrumbs));
  }, [splat, setCrumbs]);

  useEffect(() => {
    persistBreadcrumbNames(items);
  }, [items]);

  const navigateByCrumbs = (nextCrumbs: typeof items) => {
    setCrumbs(nextCrumbs);
    navigate(buildFilePath(nextCrumbs));
  };

  const handleNavigateRoot = () => {
    navigateByCrumbs([]);
  };

  const handleNavigate = (index: number) => {
    navigateByCrumbs(items.slice(0, index + 1));
  };

  return (
    <nav className="flex items-center p-4 text-gray-600">
      <button
        type="button"
        onClick={handleNavigateRoot}
        className="flex items-center hover:text-blue-600"
      >
        全部文件
      </button>

      {items.map((item, index) => {
        const isCurrent = index === items.length - 1;

        return (
          <div key={item.id} className="flex items-center">
            <ChevronRightIcon className="h-5 w-5 text-gray-400" />
            <button
              type="button"
              onClick={() => handleNavigate(index)}
              disabled={isCurrent}
              className={
                isCurrent
                  ? "cursor-default font-semibold text-gray-900"
                  : "hover:text-blue-600"
              }
            >
              {item.name}
            </button>
          </div>
        );
      })}
    </nav>
  );
};

export default FolderBreadcrumbs;
