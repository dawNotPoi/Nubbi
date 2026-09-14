import { ImgHTMLAttributes, useState } from "react";

interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  defaultLink?: string;
}
const Image = ({ src, defaultLink = "/default.jpg", ...props }: ImageProps) => {
  const [finalSrc, setFinalSrc] = useState(src || defaultLink);
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (defaultLink) {
      setFinalSrc(defaultLink);
    }
  };
  return <img src={finalSrc} onError={handleError} {...props} />;
};

export default Image;
