import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#1C1F23] group-[.toaster]:text-[#E8EDF2] group-[.toaster]:border-[#252A2F] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-[#8A95A0]",
          actionButton:
            "group-[.toast]:bg-[#3B82F6] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-[#1C1F23] group-[.toast]:text-[#8A95A0]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
