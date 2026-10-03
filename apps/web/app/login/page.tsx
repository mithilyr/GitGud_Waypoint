import { redirect } from "next/navigation";

// The single sign-in page is the home page; this keeps old /login links working.
export default function LoginRedirect() {
  redirect("/");
}
