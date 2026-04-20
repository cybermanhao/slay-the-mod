import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { ModProject } from '../types';

export async function saveProject(project: ModProject, filePath?: string): Promise<string | null> {
  let targetPath = filePath;
  
  if (!targetPath) {
    const selected = await save({
      title: 'Save Project',
      defaultPath: `${project.name}.mod.json`,
      filters: [{
        name: 'Mod Project',
        extensions: ['mod.json', 'json']
      }]
    });
    
    if (!selected) return null;
    targetPath = selected;
  }
  
  const jsonContent = JSON.stringify(project, null, 2);
  await invoke<string>('save_project', { 
    filePath: targetPath, 
    jsonContent 
  });
  
  return targetPath;
}

export async function loadProject(): Promise<{ project: ModProject; filePath: string } | null> {
  const selected = await open({
    title: 'Open Project',
    multiple: false,
    filters: [{
      name: 'Mod Project',
      extensions: ['mod.json', 'json']
    }]
  });
  
  if (!selected || Array.isArray(selected)) return null;
  
  const content = await invoke<string>('load_project', { filePath: selected });
  const project = JSON.parse(content) as ModProject;
  
  return { project, filePath: selected };
}

export async function exportMod(project: ModProject): Promise<string | null> {
  const selected = await save({
    title: 'Export Mod',
    defaultPath: project.name,
    filters: [{
      name: 'Mod Folder',
      extensions: ['zip']
    }]
  });
  
  if (!selected) return null;
  
  // TODO: Implement actual export logic
  // For now, just save the project file
  const modDir = selected.replace('.zip', '');
  const jsonContent = JSON.stringify(project, null, 2);
  
  // This would need a more complex implementation to create the full mod structure
  await invoke('save_project', { 
    filePath: `${modDir}/project.mod.json`, 
    jsonContent 
  });
  
  return selected;
}
