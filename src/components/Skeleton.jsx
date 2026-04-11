export function SkeletonBox({ className = "", style = {} }) {
  return (
    <div
      className={`bg-[#1f1f2e] rounded-lg animate-pulse ${className}`}
      style={style}
    />
  );
}

export function PostCardSkeleton() {
  return (
    <div className="bg-[#121218] rounded-2xl p-4 mb-3 mx-4">
      <div className="flex items-center mb-3">
        <SkeletonBox className="w-10 h-10 rounded-full" />
        <div className="ml-3 flex flex-col gap-1.5">
          <SkeletonBox className="w-30 h-3" />
          <SkeletonBox className="w-20 h-2.5" />
        </div>
      </div>
      <SkeletonBox className="w-full h-3.5 mb-1.5" />
      <SkeletonBox className="w-3/4 h-3.5 mb-4" />
      <SkeletonBox className="w-full h-44 rounded-xl mb-4" />
      <div className="flex gap-5">
        <SkeletonBox className="w-10 h-3" />
        <SkeletonBox className="w-10 h-3" />
      </div>
    </div>
  );
}

export function PostDetailSkeleton() {
  return (
    <div className="p-4">
      <div className="bg-[#121218] rounded-2xl p-4 mb-4">
        <div className="flex items-center mb-3">
          <SkeletonBox className="w-11 h-11 rounded-full" />
          <div className="ml-3 flex flex-col gap-1.5">
            <SkeletonBox className="w-32 h-3.5" />
            <SkeletonBox className="w-20 h-2.5" />
          </div>
        </div>
        <SkeletonBox className="w-full h-3.5 mb-1.5" />
        <SkeletonBox className="w-11/12 h-3.5 mb-1.5" />
        <SkeletonBox className="w-3/5 h-3.5 mb-4" />
        <SkeletonBox className="w-full h-52 rounded-xl mb-4" />
        <div className="flex gap-5 pt-3 border-t border-gray-800">
          <SkeletonBox className="w-10 h-3.5" />
          <SkeletonBox className="w-10 h-3.5" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex mb-4">
          <SkeletonBox className="w-8 h-8 rounded-full shrink-0" />
          <div className="ml-3 flex-1 bg-[#1a1a24] rounded-xl p-2.5 flex flex-col gap-1.5">
            <SkeletonBox className="w-24 h-2.5" />
            <SkeletonBox className="w-4/5 h-2.5" />
            <SkeletonBox className="w-3/5 h-2.5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col items-center p-6 gap-3">
      <SkeletonBox className="w-24 h-24 rounded-full" />
      <SkeletonBox className="w-36 h-4 mt-2" />
      <SkeletonBox className="w-24 h-3" />
      <SkeletonBox className="w-20 h-3" />
      <SkeletonBox className="w-28 h-9 rounded-full mt-2" />
    </div>
  );
}
