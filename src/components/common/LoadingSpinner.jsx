/**
 * LoadingSpinner component for displaying loading states
 * @param {Object} props
 * @param {string} props.size - Size of the spinner: 'sm', 'md', 'lg' (default: 'md')
 * @param {string} props.text - Optional loading text to display
 * @param {boolean} props.fullScreen - Whether to display as full screen overlay
 */
const LoadingSpinner = ({ size = "md", text, fullScreen = false }) => {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses[size]} border-blue-600 border-t-transparent rounded-full animate-spin`}
      ></div>
      {text && <p className="text-gray-600 text-sm">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
