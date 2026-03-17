export const SUPPORT_PROJECT_COPY = {
  title: "Give me a coffee",
  subtitle: "Offrez-moi un café",
  message:
    "Si le projet vous est utile, un petit café m'aidera à le garder en ligne và à le faire progresser. Merci !",
  footer:
    "Donations are 100% used for Gemini API, Server costs, and Learning Resources. Merci !",
} as const

export const SUPPORT_PROJECT_BANK = {
  bankName: "VIETCOMBANK",
  bankId: "970436",
  accountNumber: "1019350439",
  accountName: "NGUYEN LE DIEM QUYNH",
} as const

export const SUPPORT_CONFIG = {
  defaultAmount: 20000,
  transferNotePrefix: "MEMOMAP SUPPORT",
  // buyMeACoffeeUrl: "https://www.buymeacoffee.com/yourname",
} as const

export const getVietQRUrl = (userEmail?: string) => {
  const description = userEmail
    ? `${SUPPORT_CONFIG.transferNotePrefix} ${userEmail.split("@")[0]}`
    : SUPPORT_CONFIG.transferNotePrefix

  return `https://img.vietqr.io/image/${SUPPORT_PROJECT_BANK.bankId}-${SUPPORT_PROJECT_BANK.accountNumber}-compact2.png?amount=${SUPPORT_CONFIG.defaultAmount}&addTag=${encodeURIComponent(description)}&accountName=${encodeURIComponent(SUPPORT_PROJECT_BANK.accountName)}`
}
