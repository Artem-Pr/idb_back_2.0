// Manual Index Management Script
// Run this directly in MongoDB shell or via docker exec

// Step 1: Check current indexes
print('=== Current Indexes ===');
db.exif_keys.getIndexes().forEach(function (index) {
  printjson(index);
});

// Step 2: Drop the conflicting unique index
print('\n=== Dropping Conflicting Index ===');
try {
  db.exif_keys.dropIndex('UQ_0cce5fdd452145e4482056d748f');
  print('✅ Successfully dropped conflicting index');
} catch (e) {
  print('Index might not exist or already dropped: ' + e.message);
}

// Step 3: Create new unique index with proper name
print('\n=== Creating New Unique Index ===');
db.exif_keys.createIndex(
  { name: 1 },
  {
    unique: true,
    name: 'name_unique_idx',
  },
);
print('✅ Created new unique index on name field');

// Step 4: Add typeConflicts field to existing documents
print('\n=== Adding typeConflicts Field ===');
const updateResult = db.exif_keys.updateMany(
  { typeConflicts: { $exists: false } },
  { $set: { typeConflicts: null } },
);
print(
  `✅ Updated ${updateResult.modifiedCount} documents with typeConflicts field`,
);

// Step 5: Update enum values if needed
print('\n=== Updating Enum Values ===');
const enumUpdates = [
  { old: 'NOT_SUPPORTED', new: 'not_supported' },
  { old: 'string[]', new: 'string_array' },
];

enumUpdates.forEach(function (update) {
  const result = db.exif_keys.updateMany(
    { type: update.old },
    { $set: { type: update.new } },
  );
  if (result.modifiedCount > 0) {
    print(
      `✅ Updated ${result.modifiedCount} documents: ${update.old} → ${update.new}`,
    );
  }
});

// Step 6: Verify final state
print('\n=== Final Verification ===');
print('Indexes after changes:');
db.exif_keys.getIndexes().forEach(function (index) {
  printjson(index);
});

print(`\nTotal documents: ${db.exif_keys.countDocuments()}`);
print('Sample document with new structure:');
printjson(db.exif_keys.findOne());

print('\n🎉 Manual index management completed!');
