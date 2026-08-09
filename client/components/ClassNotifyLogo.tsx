import Image from "next/image";

export function ClassNotifyLogo({
  className = "w-15 h-15",
}: {
  className?: string;
}) {
  return (
    <Image
      src="/my-logo.png"
      alt="ClassNotify Logo"
      width={60}
      height={60}
      className={`${className} rounded-full object-cover`}
    />
  );
}