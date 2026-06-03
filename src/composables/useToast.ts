import { toastController } from "@ionic/vue"
import { errorMessage } from "@/api/http"

/** One toast surface for the app; mutations route success/error feedback through here. */
export function useToast() {
  const show = async (message: string, color?: "success" | "danger" | "warning") => {
    const toast = await toastController.create({ message, duration: 3000, position: "bottom", color })
    await toast.present()
  }

  return {
    success: (message: string) => show(message, "success"),
    error: (error: unknown, fallback?: string) => show(errorMessage(error, fallback), "danger"),
    info: (message: string) => show(message)
  }
}
