import { Category } from "../generated/client";

export const CategoryLabels: Record<Category, string> = {
  THUC_PHAM: "Thực phẩm",
  QUA_TANG: "Quà tặng",
  SUC_KHOE: "Sức khỏe",
  NHA: "Nhà",
  CA_NHAN_VO: "Cá nhân vợ",
  CA_NHAN_CHONG: "Cá nhân chồng",
  AN_UONG: "Ăn uống",
  DI_LAI: "Đi lại",
  GIA_DUNG: "Gia dụng",
  DU_LICH: "Du lịch",
  THUE_PHI: "Thuế/phí",
  BAO_DUONG: "Bảo dưỡng"
};

export const CategoryShortcodes: Record<string, Category> = {
  "/tp": "THUC_PHAM",
  "/au": "AN_UONG",
  "/qt": "QUA_TANG",
  "/sk": "SUC_KHOE",
  "/nh": "NHA",
  "/cnv": "CA_NHAN_VO",
  "/cnc": "CA_NHAN_CHONG",
  "/dl": "DI_LAI",
  "/gd": "GIA_DUNG",
  "/dlc": "DU_LICH",
  "/phi": "THUE_PHI",
  "/bd": "BAO_DUONG"
};

/**
 * Checks if description starts with any shortcode.
 * Returns the detected Category (or null) and the cleaned description.
 */
export function parseCategoryShortcode(desc: string): { category: Category | null, cleanDesc: string } {
  const dLow = desc.toLowerCase().trim();
  
  for (const [code, cat] of Object.entries(CategoryShortcodes)) {
    if (dLow.startsWith(code + " ") || dLow === code) {
      // Remove the shortcode from the beginning of the string (case insensitive)
      const cleanDesc = desc.substring(code.length).trim();
      return { category: cat, cleanDesc };
    }
  }
  
  return { category: null, cleanDesc: desc.trim() };
}
