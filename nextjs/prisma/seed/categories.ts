import { PrismaClient, Category } from '../../src/generated/client';

export async function seedCategories(prisma: PrismaClient) {
  console.log("Seeding Categories...");

  const categories = [
    { keyword: 'shopee', category: Category.AN_UONG },
    { keyword: 'foody', category: Category.AN_UONG },
    { keyword: 'bachhoaxanh', category: Category.THUC_PHAM },
    { keyword: 'bách hóa xanh', category: Category.THUC_PHAM },
    { keyword: 'trứng gà', category: Category.THUC_PHAM },
    { keyword: 'gà rán', category: Category.AN_UONG },
    { keyword: 'ổi', category: Category.THUC_PHAM },
    { keyword: 'siêu thị', category: Category.THUC_PHAM },
    { keyword: 'táo', category: Category.THUC_PHAM },
    { keyword: 'tiền điện', category: Category.NHA },
    { keyword: 'gửi xe', category: Category.DI_LAI },
    { keyword: 'xăng', category: Category.DI_LAI },
    { keyword: 'thuốc', category: Category.SUC_KHOE },
    { keyword: 'xét nghiệm', category: Category.SUC_KHOE },
    { keyword: 'mì', category: Category.AN_UONG },
    { keyword: 'buffet', category: Category.AN_UONG },
    { keyword: 'cơm', category: Category.AN_UONG },
    { keyword: 'dừa', category: Category.AN_UONG },
    { keyword: 'kfc', category: Category.AN_UONG },
    { keyword: 'chè', category: Category.AN_UONG },
    { keyword: 'phở', category: Category.AN_UONG },
    { keyword: 'bún', category: Category.AN_UONG },
    { keyword: 'bánh', category: Category.AN_UONG },
    { keyword: 'trà', category: Category.AN_UONG },
    { keyword: 'nước chanh', category: Category.AN_UONG },
    { keyword: 'ăn', category: Category.AN_UONG },
    { keyword: 'súp', category: Category.AN_UONG },
    { keyword: 'plan dừa', category: Category.AN_UONG },
    { keyword: 'hoành thánh', category: Category.AN_UONG },
    { keyword: 'xôi', category: Category.AN_UONG },
    { keyword: 'rau má', category: Category.AN_UONG },
    { keyword: 'máy', category: Category.GIA_DUNG },
    { keyword: 'xiên', category: Category.AN_UONG },
    { keyword: 'cá viên chiên', category: Category.AN_UONG },
    { keyword: 'cháo hàu', category: Category.AN_UONG },
    { keyword: 'cháo lòng', category: Category.AN_UONG },
    { keyword: 'cháo vịt', category: Category.AN_UONG },
    { keyword: 'cháo gà', category: Category.AN_UONG },
    { keyword: 'cháo ếch', category: Category.AN_UONG },
    { keyword: 'cháo sườn', category: Category.AN_UONG },
    { keyword: 'cháo dinh dưỡng', category: Category.AN_UONG },
    { keyword: 'cháo hải sản', category: Category.AN_UONG },
    { keyword: 'cháo mực', category: Category.AN_UONG },
    { keyword: 'cháo gói', category: Category.THUC_PHAM },
    { keyword: 'cháo hộp', category: Category.THUC_PHAM },
    { keyword: 'cháo ăn liền', category: Category.THUC_PHAM },
    { keyword: 'cháo yến mạch', category: Category.THUC_PHAM }
  ];

  await prisma.categoryMapping.deleteMany({});
  console.log("Cleared old category mappings...");

  for (const item of categories) {
    await prisma.categoryMapping.upsert({
      where: { keyword: item.keyword },
      update: { category: item.category },
      create: item,
    });
  }

  console.log("Categories seeded successfully!");
}
