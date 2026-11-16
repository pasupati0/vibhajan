import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

part 'database.g.dart';

class UsersTable extends Table {
  TextColumn get id => text()();
  TextColumn get displayName => text()();
  TextColumn get phoneE164 => text().nullable()();
  TextColumn get upiId => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  @override
  Set<Column> get primaryKey => {id};
}

class GroupsTable extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get photoPath => text().nullable()();
  BoolColumn get isArchived => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  @override
  Set<Column> get primaryKey => {id};
}

class ParticipantsTable extends Table {
  TextColumn get id => text()();
  TextColumn get groupId => text().nullable()();
  TextColumn get name => text()();
  TextColumn get phoneE164 => text().nullable()();
  TextColumn get upiId => text().nullable()();
  BoolColumn get isSelf => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  @override
  Set<Column> get primaryKey => {id};
}

class CategoriesTable extends Table {
  TextColumn get id => text()();
  TextColumn get groupId => text().nullable()();
  TextColumn get name => text()();
  TextColumn get iconCode => text()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  @override
  Set<Column> get primaryKey => {id};
}

class ExpensesTable extends Table {
  TextColumn get id => text()();
  TextColumn get groupId => text().nullable()();
  TextColumn get description => text()();
  TextColumn get category => text()();
  TextColumn get notes => text().nullable()();
  IntColumn get grossTotalPaise => integer()();
  IntColumn get taxableAmountPaise => integer()();
  IntColumn get gstRateBps => integer()();
  BoolColumn get isGstInclusive => boolean()();
  TextColumn get taxStructure => text()(); // CGST_SGST | IGST | NONE
  IntColumn get cgstPaise => integer()();
  IntColumn get sgstPaise => integer()();
  IntColumn get igstPaise => integer()();
  TextColumn get splitMode => text()(); // EQUAL | PERCENTAGE | CUSTOM
  DateTimeColumn get expenseDate => dateTime()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  @override
  Set<Column> get primaryKey => {id};
}

class ExpenseAllocationsTable extends Table {
  TextColumn get id => text()();
  TextColumn get expenseId => text()();
  TextColumn get participantId => text()();
  IntColumn get allocatedPaise => integer()();
  IntColumn get percentageBps => integer()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  @override
  Set<Column> get primaryKey => {id};
}

class OriginalBillContributionsTable extends Table {
  TextColumn get id => text()();
  TextColumn get expenseId => text()();
  TextColumn get participantId => text()();
  IntColumn get contributedPaise => integer()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  @override
  Set<Column> get primaryKey => {id};
}

class PaymentsTable extends Table {
  TextColumn get id => text()();
  TextColumn get expenseId => text()();
  TextColumn get fromParticipantId => text()();
  TextColumn get toParticipantId => text()();
  IntColumn get amountPaise => integer()();
  TextColumn get paymentMethod => text()(); // UPI | CASH | BANK | OTHER
  DateTimeColumn get paidAt => dateTime()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  @override
  Set<Column> get primaryKey => {id};
}

class SettlementsTable extends Table {
  TextColumn get id => text()();
  TextColumn get groupId => text().nullable()();
  TextColumn get expenseId => text().nullable()();
  TextColumn get fromParticipantId => text()();
  TextColumn get toParticipantId => text()();
  IntColumn get amountPaise => integer()();
  TextColumn get paymentMethod => text()();
  TextColumn get referenceNote => text().nullable()();
  DateTimeColumn get settledAt => dateTime()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  @override
  Set<Column> get primaryKey => {id};
}

class AttachmentsTable extends Table {
  TextColumn get id => text()();
  TextColumn get expenseId => text()();
  TextColumn get localFilePath => text()();
  TextColumn get mimeType => text()();
  IntColumn get byteSize => integer()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  @override
  Set<Column> get primaryKey => {id};
}

class PreferencesTable extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();
  DateTimeColumn get updatedAt => dateTime()();
  @override
  Set<Column> get primaryKey => {key};
}

class AuditRecordsTable extends Table {
  TextColumn get id => text()();
  TextColumn get entityType => text()(); // EXPENSE | ALLOCATION | PAYMENT | SETTLEMENT
  TextColumn get entityId => text()();
  TextColumn get action => text()(); // CREATED | UPDATED | DELETED
  TextColumn get previousJson => text().nullable()();
  TextColumn get nextJson => text()();
  DateTimeColumn get createdAt => dateTime()();
  @override
  Set<Column> get primaryKey => {id};
}

class SyncOutboxTable extends Table {
  TextColumn get id => text()();
  TextColumn get entityType => text()();
  TextColumn get entityId => text()();
  TextColumn get operation => text()(); // UPSERT | SOFT_DELETE
  TextColumn get payloadJson => text()();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  TextColumn get syncStatus => text().withDefault(const Constant('PENDING'))();
  DateTimeColumn get createdAt => dateTime()();
  @override
  Set<Column> get primaryKey => {id};
}

@DriftDatabase(
  tables: [
    UsersTable,
    GroupsTable,
    ParticipantsTable,
    CategoriesTable,
    ExpensesTable,
    ExpenseAllocationsTable,
    OriginalBillContributionsTable,
    PaymentsTable,
    SettlementsTable,
    AttachmentsTable,
    PreferencesTable,
    AuditRecordsTable,
    SyncOutboxTable,
  ],
)
class BaatoDatabase extends _$BaatoDatabase {
  BaatoDatabase([QueryExecutor? executor]) : super(executor ?? _openConnection());

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (Migrator m) async {
          await m.createAll();
          await customStatement(
            'CREATE INDEX IF NOT EXISTS idx_expenses_group_date ON expenses_table (group_id, expense_date DESC);',
          );
          await customStatement(
            'CREATE INDEX IF NOT EXISTS idx_allocations_expense ON expense_allocations_table (expense_id, participant_id);',
          );
          await customStatement(
            'CREATE INDEX IF NOT EXISTS idx_settlements_participants ON settlements_table (from_participant_id, to_participant_id);',
          );
          await customStatement(
            'CREATE INDEX IF NOT EXISTS idx_sync_outbox_status ON sync_outbox_table (sync_status, created_at ASC);',
          );
        },
        onUpgrade: (Migrator m, int from, int to) async {
          if (from < 2) {
            await customStatement(
              'CREATE INDEX IF NOT EXISTS idx_sync_outbox_status ON sync_outbox_table (sync_status, created_at ASC);',
            );
          }
        },
      );
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File(p.join(dir.path, 'baato_split_v1.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}