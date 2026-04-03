import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";

export default function VerifyEmailPage() {
  const [search] = useSearchParams();
  const token = search.get("token") || "";
  const [status, setStatus] = useState("Verifying...");

  useEffect(() => {
    if (!token) {
      setStatus("Missing verification token.");
      return;
    }
    api
      .get(`/auth/verify/${token}`)
      .then((res) => setStatus(res.data.message || "Email verified"))
      .catch((err) => {
        const msg = err.response?.data?.message;

        if (msg?.includes("invalid") || msg?.includes("used")) {
          setStatus("This link was already used or expired. Try logging in.");
        } else {
          setStatus(msg || "Verification failed");
        }
    });
  }, [token]);

  return (
    <section>
      <h2>Email Verification</h2>
      <p>{status}</p>
    </section>
  );
}
