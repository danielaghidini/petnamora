const messages: Record<string, string> = {
  not_configured: "O login com Google ainda não está configurado. Você pode entrar com e-mail e senha.",
  invalid_state: "Sua tentativa de login com Google expirou. Tente novamente.",
  cancelled: "O login com Google foi cancelado. Você pode tentar novamente.",
  email_not_verified: "Use uma conta Google com e-mail verificado.",
  adult_required: "Confirme que você é maior de 18 anos para continuar com Google.",
  account_suspended: "Esta conta está suspensa. Entre em contato com a equipe do Pet Namora.",
  use_password: "Para acessar esta conta, entre com seu e-mail e senha.",
  failed: "Não foi possível entrar com Google. Tente novamente.",
};

export function googleAuthErrorMessage(code: string | undefined) {
  return code ? (Object.hasOwn(messages, code) ? messages[code] : messages.failed) : "";
}
