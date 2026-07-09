import { File } from './File';
import { FileShareModel } from './FileShare';
import sequelize from '../config/database';

// Ajouter les modèles à Sequelize
sequelize.addModels([
  File,
  FileShareModel,
]);

/**
 * Initialiser les associations entre modèles
 */
export const initializeAssociations = (): void => {
  // FileShare -> File (Un partage appartient à un fichier)
  FileShareModel.belongsTo(File, {
    foreignKey: 'fileId',
    as: 'file',
    onDelete: 'CASCADE',
  });

  // File -> FileShare (Un fichier peut avoir plusieurs partages)
  File.hasMany(FileShareModel, {
    foreignKey: 'fileId',
    as: 'shares',
    onDelete: 'CASCADE',
  });

  console.log('✅ Associations de modèles initialisées');
};

/**
 * Connecter à la base de données et synchroniser les modèles
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    // Tester la connexion
    await sequelize.authenticate();
    console.log('✅ Connexion PostgreSQL établie');

    // Initialiser les associations
    initializeAssociations();

    // Synchroniser les modèles (sans forcer)
    await sequelize.sync({ alter: false });
    console.log('✅ Synchronisation des modèles terminée');

  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error);
    throw error;
  }
};

/**
 * Fermer la connexion à la base de données
 */
export const closeDatabase = async (): Promise<void> => {
  try {
    await sequelize.close();
    console.log('✅ Connexion à la base de données fermée');
  } catch (error) {
    console.error('❌ Erreur lors de la fermeture de la base de données:', error);
    throw error;
  }
};

/**
 * Fonction utilitaire pour les transactions
 */
export const withTransaction = async <T>(
  callback: (transaction: any) => Promise<T>
): Promise<T> => {
  const transaction = await sequelize.transaction();
  
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export {
  File,
  FileShareModel,
  sequelize,
};
