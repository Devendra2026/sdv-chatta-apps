import { redirect } from "next/navigation"

/** Public self-registration is disabled; admins provision staff in Settings → Users. */
export default function SignupPage() {
  redirect("/login")
}
