"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new client_1.PrismaClient();
async function main() {
    const passwordHash = await bcrypt.hash('password123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@pharma.local' },
        update: {
            fullName: 'Администратор системы',
            passwordHash,
            role: client_1.UserRole.ADMIN,
            organization: 'Pharma Platform',
            verified: true,
        },
        create: {
            fullName: 'Администратор системы',
            email: 'admin@pharma.local',
            passwordHash,
            role: client_1.UserRole.ADMIN,
            organization: 'Pharma Platform',
            verified: true,
        },
    });
    const doctor = await prisma.user.upsert({
        where: { email: 'doctor@clinic.local' },
        update: {
            fullName: 'Иванов Иван Иванович',
            passwordHash,
            role: client_1.UserRole.DOCTOR,
            organization: 'Городская больница №1',
            verified: true,
        },
        create: {
            fullName: 'Иванов Иван Иванович',
            email: 'doctor@clinic.local',
            passwordHash,
            role: client_1.UserRole.DOCTOR,
            organization: 'Городская больница №1',
            verified: true,
        },
    });
    await prisma.drugImport.upsert({
        where: { id: 1 },
        update: {
            source: 'manual-seed',
            status: client_1.ImportStatus.COMPLETED,
            recordsProcessed: 7,
            recordsFailed: 0,
            startedAt: new Date(),
            completedAt: new Date(),
            createdBy: admin.id,
        },
        create: {
            id: 1,
            source: 'manual-seed',
            status: client_1.ImportStatus.COMPLETED,
            recordsProcessed: 7,
            recordsFailed: 0,
            startedAt: new Date(),
            completedAt: new Date(),
            createdBy: admin.id,
        },
    });
    const acetylsalicylicAcid = await prisma.substance.upsert({
        where: { name: 'Ацетилсалициловая кислота' },
        update: {
            latinName: 'Acidum acetylsalicylicum',
            description: 'НПВС, антиагрегант и анальгетик.',
        },
        create: {
            name: 'Ацетилсалициловая кислота',
            latinName: 'Acidum acetylsalicylicum',
            description: 'НПВС, антиагрегант и анальгетик.',
        },
    });
    const warfarinSubstance = await prisma.substance.upsert({
        where: { name: 'Варфарин' },
        update: {
            latinName: 'Warfarin',
            description: 'Антикоагулянт непрямого действия.',
        },
        create: {
            name: 'Варфарин',
            latinName: 'Warfarin',
            description: 'Антикоагулянт непрямого действия.',
        },
    });
    const ibuprofenSubstance = await prisma.substance.upsert({
        where: { name: 'Ибупрофен' },
        update: {
            latinName: 'Ibuprofen',
            description: 'НПВС с анальгезирующим и противовоспалительным действием.',
        },
        create: {
            name: 'Ибупрофен',
            latinName: 'Ibuprofen',
            description: 'НПВС с анальгезирующим и противовоспалительным действием.',
        },
    });
    const paracetamolSubstance = await prisma.substance.upsert({
        where: { name: 'Парацетамол' },
        update: {
            latinName: 'Paracetamol',
            description: 'Анальгетик и жаропонижающее средство.',
        },
        create: {
            name: 'Парацетамол',
            latinName: 'Paracetamol',
            description: 'Анальгетик и жаропонижающее средство.',
        },
    });
    const nsaidSubstance = await prisma.substance.upsert({
        where: { name: 'НПВС' },
        update: {
            description: 'Фармакологическая группа нестероидных противовоспалительных средств.',
        },
        create: {
            name: 'НПВС',
            description: 'Фармакологическая группа нестероидных противовоспалительных средств.',
        },
    });
    const substanceSynonyms = [
        { substanceId: acetylsalicylicAcid.id, synonym: 'АСК' },
        { substanceId: acetylsalicylicAcid.id, synonym: 'аспирин вещество' },
        { substanceId: warfarinSubstance.id, synonym: 'warfarin' },
        { substanceId: ibuprofenSubstance.id, synonym: 'ibuprofen' },
        { substanceId: paracetamolSubstance.id, synonym: 'acetaminophen' },
    ];
    for (const item of substanceSynonyms) {
        await prisma.substanceSynonym.upsert({
            where: {
                substanceId_synonym: {
                    substanceId: item.substanceId,
                    synonym: item.synonym,
                },
            },
            update: {},
            create: item,
        });
    }
    const aspirin = await prisma.drug.upsert({
        where: { slug: 'aspirin' },
        update: {
            name: 'Аспирин',
            dosageForm: 'таблетки',
            manufacturer: 'Bayer',
            atcCode: 'B01AC06',
            rxRequired: false,
            description: 'Препарат ацетилсалициловой кислоты.',
            active: true,
        },
        create: {
            name: 'Аспирин',
            slug: 'aspirin',
            dosageForm: 'таблетки',
            manufacturer: 'Bayer',
            atcCode: 'B01AC06',
            rxRequired: false,
            description: 'Препарат ацетилсалициловой кислоты.',
            active: true,
        },
    });
    const aspirinCardio = await prisma.drug.upsert({
        where: { slug: 'aspirin-cardio' },
        update: {
            name: 'Аспирин Кардио',
            dosageForm: 'таблетки',
            manufacturer: 'Bayer',
            atcCode: 'B01AC06',
            rxRequired: false,
            description: 'Низкодозированный антиагрегант на основе ацетилсалициловой кислоты.',
            active: true,
        },
        create: {
            name: 'Аспирин Кардио',
            slug: 'aspirin-cardio',
            dosageForm: 'таблетки',
            manufacturer: 'Bayer',
            atcCode: 'B01AC06',
            rxRequired: false,
            description: 'Низкодозированный антиагрегант на основе ацетилсалициловой кислоты.',
            active: true,
        },
    });
    const cardiomagnyl = await prisma.drug.upsert({
        where: { slug: 'cardiomagnyl' },
        update: {
            name: 'Кардиомагнил',
            dosageForm: 'таблетки',
            manufacturer: 'Takeda',
            atcCode: 'B01AC30',
            rxRequired: false,
            description: 'Комбинированный антиагрегант на основе ацетилсалициловой кислоты.',
            active: true,
        },
        create: {
            name: 'Кардиомагнил',
            slug: 'cardiomagnyl',
            dosageForm: 'таблетки',
            manufacturer: 'Takeda',
            atcCode: 'B01AC30',
            rxRequired: false,
            description: 'Комбинированный антиагрегант на основе ацетилсалициловой кислоты.',
            active: true,
        },
    });
    const warfarinDrug = await prisma.drug.upsert({
        where: { slug: 'warfarin' },
        update: {
            name: 'Варфарин',
            dosageForm: 'таблетки',
            manufacturer: 'Nycomed',
            atcCode: 'B01AA03',
            rxRequired: true,
            description: 'Антикоагулянт непрямого действия.',
            active: true,
        },
        create: {
            name: 'Варфарин',
            slug: 'warfarin',
            dosageForm: 'таблетки',
            manufacturer: 'Nycomed',
            atcCode: 'B01AA03',
            rxRequired: true,
            description: 'Антикоагулянт непрямого действия.',
            active: true,
        },
    });
    const ibuprofenDrug = await prisma.drug.upsert({
        where: { slug: 'ibuprofen' },
        update: {
            name: 'Ибупрофен',
            dosageForm: 'таблетки',
            manufacturer: 'Dr. Reddy’s',
            atcCode: 'M01AE01',
            rxRequired: false,
            description: 'НПВС для снижения боли и воспаления.',
            active: true,
        },
        create: {
            name: 'Ибупрофен',
            slug: 'ibuprofen',
            dosageForm: 'таблетки',
            manufacturer: 'Dr. Reddy’s',
            atcCode: 'M01AE01',
            rxRequired: false,
            description: 'НПВС для снижения боли и воспаления.',
            active: true,
        },
    });
    const nurofen = await prisma.drug.upsert({
        where: { slug: 'nurofen' },
        update: {
            name: 'Нурофен',
            dosageForm: 'таблетки',
            manufacturer: 'Reckitt Benckiser',
            atcCode: 'M01AE01',
            rxRequired: false,
            description: 'Торговое наименование ибупрофена.',
            active: true,
        },
        create: {
            name: 'Нурофен',
            slug: 'nurofen',
            dosageForm: 'таблетки',
            manufacturer: 'Reckitt Benckiser',
            atcCode: 'M01AE01',
            rxRequired: false,
            description: 'Торговое наименование ибупрофена.',
            active: true,
        },
    });
    const paracetamolDrug = await prisma.drug.upsert({
        where: { slug: 'paracetamol' },
        update: {
            name: 'Парацетамол',
            dosageForm: 'таблетки',
            manufacturer: 'Фармстандарт',
            atcCode: 'N02BE01',
            rxRequired: false,
            description: 'Анальгетик и жаропонижающее средство.',
            active: true,
        },
        create: {
            name: 'Парацетамол',
            slug: 'paracetamol',
            dosageForm: 'таблетки',
            manufacturer: 'Фармстандарт',
            atcCode: 'N02BE01',
            rxRequired: false,
            description: 'Анальгетик и жаропонижающее средство.',
            active: true,
        },
    });
    const drugSubstances = [
        {
            drugId: aspirin.id,
            substanceId: acetylsalicylicAcid.id,
            strengthValue: '500',
            strengthUnit: 'mg',
            isPrimary: true,
        },
        {
            drugId: aspirinCardio.id,
            substanceId: acetylsalicylicAcid.id,
            strengthValue: '100',
            strengthUnit: 'mg',
            isPrimary: true,
        },
        {
            drugId: cardiomagnyl.id,
            substanceId: acetylsalicylicAcid.id,
            strengthValue: '75',
            strengthUnit: 'mg',
            isPrimary: true,
        },
        {
            drugId: warfarinDrug.id,
            substanceId: warfarinSubstance.id,
            strengthValue: '5',
            strengthUnit: 'mg',
            isPrimary: true,
        },
        {
            drugId: ibuprofenDrug.id,
            substanceId: ibuprofenSubstance.id,
            strengthValue: '200',
            strengthUnit: 'mg',
            isPrimary: true,
        },
        {
            drugId: nurofen.id,
            substanceId: ibuprofenSubstance.id,
            strengthValue: '200',
            strengthUnit: 'mg',
            isPrimary: true,
        },
        {
            drugId: paracetamolDrug.id,
            substanceId: paracetamolSubstance.id,
            strengthValue: '500',
            strengthUnit: 'mg',
            isPrimary: true,
        },
    ];
    for (const item of drugSubstances) {
        await prisma.drugSubstance.upsert({
            where: {
                drugId_substanceId: {
                    drugId: item.drugId,
                    substanceId: item.substanceId,
                },
            },
            update: {
                strengthValue: item.strengthValue,
                strengthUnit: item.strengthUnit,
                isPrimary: item.isPrimary,
            },
            create: item,
        });
    }
    const analogs = [
        {
            sourceDrugId: aspirin.id,
            targetDrugId: aspirinCardio.id,
            reason: 'Общее действующее вещество: ацетилсалициловая кислота',
            confidence: 95,
        },
        {
            sourceDrugId: aspirin.id,
            targetDrugId: cardiomagnyl.id,
            reason: 'Сходный антиагрегантный профиль по действующему веществу',
            confidence: 90,
        },
        {
            sourceDrugId: ibuprofenDrug.id,
            targetDrugId: nurofen.id,
            reason: 'Одинаковое действующее вещество: ибупрофен',
            confidence: 98,
        },
        {
            sourceDrugId: nurofen.id,
            targetDrugId: ibuprofenDrug.id,
            reason: 'Одинаковое действующее вещество: ибупрофен',
            confidence: 98,
        },
    ];
    for (const item of analogs) {
        await prisma.drugAnalog.upsert({
            where: {
                sourceDrugId_targetDrugId: {
                    sourceDrugId: item.sourceDrugId,
                    targetDrugId: item.targetDrugId,
                },
            },
            update: {
                reason: item.reason,
                confidence: item.confidence,
            },
            create: item,
        });
    }
    const drugInteractions = [
        {
            drugAId: aspirin.id,
            drugBId: warfarinDrug.id,
            severity: client_1.InteractionSeverity.HIGH,
            mechanism: 'Повышение риска кровотечений при сочетании антиагреганта и антикоагулянта.',
            clinicalEffect: 'Увеличение вероятности геморрагических осложнений.',
            recommendation: 'Избегать сочетания без контроля врача; контролировать INR и признаки кровотечения.',
            source: 'seed-demo',
        },
        {
            drugAId: ibuprofenDrug.id,
            drugBId: warfarinDrug.id,
            severity: client_1.InteractionSeverity.HIGH,
            mechanism: 'НПВС повышают риск кровотечений на фоне антикоагулянтов.',
            clinicalEffect: 'Повышение риска желудочно-кишечного и системного кровотечения.',
            recommendation: 'По возможности избегать сочетания; рассмотреть альтернативы.',
            source: 'seed-demo',
        },
    ];
    for (const item of drugInteractions) {
        await prisma.drugInteraction.upsert({
            where: {
                drugAId_drugBId: {
                    drugAId: item.drugAId,
                    drugBId: item.drugBId,
                },
            },
            update: {
                severity: item.severity,
                mechanism: item.mechanism,
                clinicalEffect: item.clinicalEffect,
                recommendation: item.recommendation,
                source: item.source,
            },
            create: item,
        });
    }
    const substanceInteractions = [
        {
            substanceAId: acetylsalicylicAcid.id,
            substanceBId: warfarinSubstance.id,
            severity: client_1.InteractionSeverity.HIGH,
            mechanism: 'Аддитивный антикоагулянтный/антиагрегантный эффект.',
            clinicalEffect: 'Рост риска кровотечений.',
            recommendation: 'Требуется врачебный контроль.',
            source: 'seed-demo',
        },
        {
            substanceAId: ibuprofenSubstance.id,
            substanceBId: warfarinSubstance.id,
            severity: client_1.InteractionSeverity.HIGH,
            mechanism: 'Повышение риска кровотечения при сочетании НПВС и антикоагулянта.',
            clinicalEffect: 'Увеличение риска осложнений со стороны ЖКТ и гемостаза.',
            recommendation: 'Избегать без необходимости.',
            source: 'seed-demo',
        },
    ];
    for (const item of substanceInteractions) {
        await prisma.substanceInteraction.upsert({
            where: {
                substanceAId_substanceBId: {
                    substanceAId: item.substanceAId,
                    substanceBId: item.substanceBId,
                },
            },
            update: {
                severity: item.severity,
                mechanism: item.mechanism,
                clinicalEffect: item.clinicalEffect,
                recommendation: item.recommendation,
                source: item.source,
            },
            create: item,
        });
    }
    const contraindications = [
        {
            drugId: aspirin.id,
            condition: 'Язвенная болезнь желудка',
            minAge: 18,
            context: 'обострение',
            severity: 'HIGH',
            note: 'Повышенный риск желудочно-кишечного кровотечения.',
        },
        {
            drugId: warfarinDrug.id,
            condition: 'Беременность',
            severity: 'HIGH',
            note: 'Требуется особая оценка риска и пользы.',
        },
        {
            drugId: ibuprofenDrug.id,
            condition: 'Язвенная болезнь желудка',
            severity: 'MODERATE',
            note: 'НПВС могут усугублять течение заболевания.',
        },
    ];
    for (const item of contraindications) {
        await prisma.contraindication.create({
            data: item,
        });
    }
    const favorites = [
        { userId: doctor.id, drugId: aspirin.id },
        { userId: doctor.id, drugId: paracetamolDrug.id },
        { userId: admin.id, drugId: warfarinDrug.id },
    ];
    for (const item of favorites) {
        await prisma.favoriteDrug.upsert({
            where: {
                userId_drugId: {
                    userId: item.userId,
                    drugId: item.drugId,
                },
            },
            update: {},
            create: item,
        });
    }
    await prisma.auditLog.create({
        data: {
            userId: admin.id,
            action: 'SEED_COMPLETED',
            entityType: 'system',
            entityId: 'drug-domain-v1',
            newValues: {
                users: 2,
                drugs: 7,
                substances: 5,
                analogs: 4,
                drugInteractions: 2,
                substanceInteractions: 2,
                contraindications: 3,
            },
        },
    });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map