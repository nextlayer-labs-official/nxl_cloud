import { useEffect, useState } from "react";
import type { CurrentUser } from "../../shared/types";
import { Browser } from "./pages/Browser";
import { Login } from "./pages/Login";

type AuthState = { status: "checking" } | { status: "signed-out" } | { status: "signed-in"; user: CurrentUser };

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ status: "checking" });

  useEffect(() => {
    window.skylyer.getCurrentUser().then((user) => {
      setAuth(user ? { status: "signed-in", user } : { status: "signed-out" });
    });
  }, []);

  if (auth.status === "checking") return null;

  if (auth.status === "signed-out") {
    return <Login onSignedIn={(user) => setAuth({ status: "signed-in", user })} />;
  }

  return (
    <Browser
      user={auth.user}
      onSignOut={async () => {
        await window.skylyer.logout();
        setAuth({ status: "signed-out" });
      }}
    />
  );
}
