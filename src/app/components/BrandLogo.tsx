import activateLogo from '../../assets/activate-logo.png';

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  textClassName?: string;
  subtitleClassName?: string;
  showSubtitle?: boolean;
}

export const BrandLogo = ({
  className = '',
  imageClassName = '',
  textClassName = '',
  subtitleClassName = '',
  showSubtitle = false,
}: BrandLogoProps) => (
  <div className={`flex items-center gap-3 ${className}`.trim()}>
    <img
      src={activateLogo}
      alt="Activate"
      className={`h-10 w-auto max-w-full object-contain ${imageClassName}`.trim()}
    />
    {showSubtitle && (
      <div>
        <p className={`text-sm text-gray-500 ${subtitleClassName}`.trim()}>
          Quotation Management
        </p>
      </div>
    )}
  </div>
);
