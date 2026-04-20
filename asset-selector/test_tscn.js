// test_tscn.js - Test tscn parser against real STS2 files
import { parseTscn, generateTscn } from '../packages/sts2-mcp-server/src/tools/scene/tscn.ts';
import fs from 'fs';

const TEST_FILES = [
  'C:/code/slay-the-mod/reference/decompiled_src/Slay the Spire 2/scenes/asset_loader.tscn',
  'C:/code/slay-the-mod/reference/decompiled_src/Slay the Spire 2/scenes/backgrounds/ceremonial_beast_boss/ceremonial_beast_boss_background.tscn',
];

for (const file of TEST_FILES) {
  console.log(`\n=== Testing: ${file.split('/').pop()} ===`);
  const content = fs.readFileSync(file, 'utf-8');
  const { resources, nodes } = parseTscn(content);

  console.log(`Resources: ${resources.length}`);
  console.log(`Nodes: ${nodes.length}`);

  // Show first few resources
  console.log('\n--- Resources (first 3) ---');
  for (const r of resources.slice(0, 3)) {
    console.log(`  [${r.type}] id=${r.id} path=${r.path || 'N/A'}`);
  }

  // Show first few nodes
  console.log('\n--- Nodes (first 5) ---');
  for (const n of nodes.slice(0, 5)) {
    console.log(`  ${n.name} (${n.type}) parent=${n.parent || 'root'}`);
    const keys = Object.keys(n.properties).slice(0, 3);
    if (keys.length > 0) console.log(`    props: ${keys.join(', ')}...`);
  }

  // Round-trip test: generate and re-parse
  console.log('\n--- Round-trip test ---');
  const generated = generateTscn(resources, nodes);
  const { resources: r2, nodes: n2 } = parseTscn(generated);

  const resourcesMatch = r2.length === resources.length;
  const nodesMatch = n2.length === nodes.length;
  console.log(`Resources round-trip: ${r2.length} → ${resources.length} ${resourcesMatch ? '✓' : '✗'}`);
  console.log(`Nodes round-trip: ${n2.length} → ${nodes.length} ${nodesMatch ? '✓' : '✗'}`);

  // Check key properties preserved
  if (nodes.length > 0) {
    const orig = nodes[0];
    const gen = n2.find(n => n.name === orig.name);
    if (gen) {
      const origKeys = Object.keys(orig.properties).sort();
      const genKeys = Object.keys(gen.properties).sort();
      const propsMatch = JSON.stringify(origKeys) === JSON.stringify(genKeys);
      console.log(`Node[0] properties preserved: ${propsMatch ? '✓' : '✗'}`);
    }
  }
}

// Test specific issues with parent/child relationship
console.log('\n=== Parent/Child relationship test ===');
const bgContent = fs.readFileSync(TEST_FILES[1], 'utf-8');
const { nodes } = parseTscn(bgContent);

// Find beads_16 node
const beads16 = nodes.find(n => n.name === 'beads_16');
console.log('beads_16:', JSON.stringify({
  name: beads16?.name,
  type: beads16?.type,
  parent: beads16?.parent,
  properties: Object.keys(beads16?.properties || {})
}, null, 2));

// Find Layer_04 node
const layer04 = nodes.find(n => n.name === 'Layer_04');
console.log('Layer_04:', JSON.stringify({
  name: layer04?.name,
  type: layer04?.type,
  parent: layer04?.parent,
  properties: Object.keys(layer04?.properties || {})
}, null, 2));
