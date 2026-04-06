export function Login() {
  return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-[400px]">
          {/* Logo and tagline */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Gantodo</h1>
            <p className="text-sm text-gray-500">
              Project management with timelines and tasks
            </p>
          </div>

          {/* Sign-in card */}
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Sign in to continue
            </h2>

            {/* Continue with Google button */}
            <a
                href="/oauth2/authorization/google"
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                    d="M17.64 9.20443C17.64 8.56625 17.5827 7.95262 17.4764 7.36353H9V10.8449H13.8436C13.635 11.9699 13.0009 12.9231 12.0477 13.5613V15.8194H14.9564C16.6582 14.2526 17.64 11.9453 17.64 9.20443Z"
                    fill="#4285F4"
                />
                <path
                    d="M8.99976 18C11.4298 18 13.467 17.1941 14.9561 15.8195L12.0475 13.5613C11.2416 14.1013 10.2107 14.4204 8.99976 14.4204C6.65567 14.4204 4.67158 12.8372 3.96385 10.71H0.957031V13.0418C2.43794 15.9831 5.48158 18 8.99976 18Z"
                    fill="#34A853"
                />
                <path
                    d="M3.96409 10.7098C3.78409 10.1698 3.68182 9.59301 3.68182 8.99983C3.68182 8.40665 3.78409 7.82983 3.96409 7.28983V4.95801H0.957273C0.347727 6.17301 0 7.54755 0 8.99983C0 10.4521 0.347727 11.8266 0.957273 13.0416L3.96409 10.7098Z"
                    fill="#FBBC05"
                />
                <path
                    d="M8.99976 3.57955C10.3211 3.57955 11.5075 4.03364 12.4402 4.92545L15.0216 2.34409C13.4629 0.891818 11.4257 0 8.99976 0C5.48158 0 2.43794 2.01682 0.957031 4.95818L3.96385 7.29C4.67158 5.16273 6.65567 3.57955 8.99976 3.57955Z"
                    fill="#EA4335"
                />
              </svg>
              Continue with Google
            </a>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <a
                  href="#"
                  className="hover:text-gray-900 transition-colors"
              >
                Terms
              </a>
              <span className="text-gray-300">•</span>
              <a
                  href="#"
                  className="hover:text-gray-900 transition-colors"
              >
                Privacy
              </a>
            </div>
          </div>
        </div>
      </div>
  );
}