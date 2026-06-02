from __future__ import annotations

import argparse
import getpass
import os
from typing import Any

import httpx
from dotenv import load_dotenv


def _prompt_required(label: str, default: str | None = None, secret: bool = False) -> str:
    if default:
        value = input(f"{label} [{default}]: ").strip()
        return value or default

    while True:
        value = getpass.getpass(f"{label}: ") if secret else input(f"{label}: ")
        value = value.strip()
        if value:
            return value
        print(f"{label} is required.")


def _request_access_token(supabase_url: str, anon_key: str, email: str, password: str) -> dict[str, Any]:
    url = f"{supabase_url.rstrip('/')}/auth/v1/token?grant_type=password"
    response = httpx.post(
        url,
        headers={
            "apikey": anon_key,
            "Content-Type": "application/json",
        },
        json={
            "email": email,
            "password": password,
        },
        timeout=30,
    )

    try:
        payload = response.json()
    except ValueError:
        payload = {"raw_body": response.text}

    if response.status_code >= 400:
        print("\nLogin failed.")
        print(f"HTTP status: {response.status_code}")
        print(payload)
        raise SystemExit(1)

    return payload


def main() -> None:
    load_dotenv(override=False)

    parser = argparse.ArgumentParser(
        description="Login Supabase email/password and print an access token for manual API testing.",
    )
    parser.add_argument("--supabase-url", default=os.getenv("SUPABASE_URL"))
    parser.add_argument("--anon-key", default=os.getenv("SUPABASE_KEY"))
    parser.add_argument("--email", default=os.getenv("SUPABASE_TEST_EMAIL"))
    parser.add_argument("--password", default=os.getenv("SUPABASE_TEST_PASSWORD"))
    args = parser.parse_args()

    supabase_url = args.supabase_url or _prompt_required("SUPABASE_URL")
    anon_key = args.anon_key or _prompt_required("SUPABASE anon key")
    email = args.email or _prompt_required("Email")
    password = args.password or _prompt_required("Password", secret=True)

    payload = _request_access_token(supabase_url, anon_key, email, password)

    access_token = payload.get("access_token")
    if not access_token:
        print("Supabase response did not contain access_token.")
        print(payload)
        raise SystemExit(1)

    user = payload.get("user") or {}

    print("\nLogin succeeded.")
    print(f"User ID: {user.get('id')}")
    print(f"Email: {user.get('email')}")
    print(f"Expires in: {payload.get('expires_in')} seconds")
    print("\nAccess token:")
    print(access_token)
    print("\nAuthorization header:")
    print(f"Bearer {access_token}")
    print("\nWarning: do not commit, paste into public chat, or share this token.")


if __name__ == "__main__":
    main()
