import os
import json
import glob
import asyncio
from pathlib import Path

# The decky plugin module is located at decky-loader/plugin
# For easy intellisense checkout the decky-loader code repo
# and add the `decky-loader/plugin/imports` path to `python.analysis.extraPaths` in `.vscode/settings.json`
import decky

class Plugin:
    
    def __init__(self):
        self.steam_paths = []
    
    async def get_installed_games(self) -> list:
        """
        Get a list of installed Steam games by scanning library folders and ACF files
        Returns a list of dictionaries with 'name' and 'appid' for each installed game
        """
        try:
            games = []
            seen_appids = set()  # Track seen app IDs to prevent duplicates
            steam_paths = await self._find_steam_libraries()
            
            for steam_path in steam_paths:
                steamapps_path = os.path.join(steam_path, 'steamapps')
                if not os.path.exists(steamapps_path):
                    continue
                    
                # Find all appmanifest_*.acf files
                acf_pattern = os.path.join(steamapps_path, 'appmanifest_*.acf')
                acf_files = glob.glob(acf_pattern)
                
                for acf_file in acf_files:
                    try:
                        game_info = await self._parse_acf_file(acf_file)
                        if game_info and game_info.get('installed', False):
                            appid = game_info['appid']
                            # Only add if we haven't seen this app ID before
                            if appid not in seen_appids:
                                seen_appids.add(appid)
                                games.append({
                                    'name': game_info['name'],
                                    'appid': appid
                                })
                    except Exception as e:
                        decky.logger.warning(f"Failed to parse ACF file {acf_file}: {e}")
                        
            # Sort games by name for better UX
            games.sort(key=lambda x: x['name'].lower())
            decky.logger.info(f"Found {len(games)} unique installed games from {len(seen_appids)} total")
            return games
            
        except Exception as e:
            decky.logger.error(f"Error getting installed games: {e}")
            return []
    
    async def _find_steam_libraries(self) -> list:
        """
        Find all Steam library paths by parsing libraryfolders.vdf
        Returns a list of Steam library paths
        """
        steam_paths = []
        
        # Primary Steam installation path
        primary_steam_path = os.path.expanduser('~/.local/share/Steam')
        if os.path.exists(primary_steam_path):
            steam_paths.append(primary_steam_path)
        
        # Check for additional library folders
        library_vdf_path = os.path.join(primary_steam_path, 'steamapps', 'libraryfolders.vdf')
        if os.path.exists(library_vdf_path):
            try:
                additional_paths = await self._parse_library_folders_vdf(library_vdf_path)
                # Deduplicate paths
                for path in additional_paths:
                    if path not in steam_paths:
                        steam_paths.append(path)
            except Exception as e:
                decky.logger.warning(f"Failed to parse libraryfolders.vdf: {e}")
        
        decky.logger.info(f"Found Steam library paths: {steam_paths}")
        return steam_paths
    
    async def _parse_library_folders_vdf(self, vdf_path: str) -> list:
        """
        Parse libraryfolders.vdf to find additional Steam library locations
        Simple VDF parser for the specific structure we need
        """
        library_paths = []
        
        try:
            with open(vdf_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            lines = content.split('\n')
            for line in lines:
                line = line.strip()
                if line.startswith('"path"'):
                    path_start = line.find('"', 6)  # Start after "path"
                    if path_start != -1:
                        path_end = line.find('"', path_start + 1)
                        if path_end != -1:
                            library_path = line[path_start + 1:path_end]
                            if os.path.exists(library_path) and library_path not in library_paths:
                                library_paths.append(library_path)
                                
        except Exception as e:
            decky.logger.error(f"Error parsing libraryfolders.vdf: {e}")
            
        return library_paths
    
    async def _parse_acf_file(self, acf_path: str) -> dict:
        """
        Parse an ACF (App Cache File) to extract game information
        Simple ACF parser for the fields we need
        """
        try:
            with open(acf_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            game_info = {}
            lines = content.split('\n')
            
            for line in lines:
                line = line.strip()
                
                # Extract appid
                if line.startswith('"appid"'):
                    parts = line.split('"')
                    if len(parts) >= 4:
                        appid = parts[3]
                        game_info['appid'] = appid
                
                # Extract name
                elif line.startswith('"name"'):
                    parts = line.split('"')
                    if len(parts) >= 4:
                        name = parts[3]
                        game_info['name'] = name
                
                # Check if game is installed (StateFlags = "4" means fully installed)
                elif line.startswith('"StateFlags"'):
                    parts = line.split('"')
                    if len(parts) >= 4:
                        state_flags = parts[3]
                        # StateFlags "4" means fully installed and updated
                        game_info['installed'] = state_flags == '4'
            
            # Only return if we have both appid and name, and game is installed
            if 'appid' in game_info and 'name' in game_info and game_info.get('installed', False):
                return game_info
            return None
            
        except Exception as e:
            decky.logger.error(f"Error parsing ACF file {acf_path}: {e}")
            return None

    async def _main(self):
        decky.logger.info("GamesWiki plugin loaded!")

    async def _unload(self):
        decky.logger.info("GamesWiki plugin unloaded!")
        pass

    async def _uninstall(self):
        decky.logger.info("GamesWiki plugin uninstalled!")
        pass

    async def _migration(self):
        decky.logger.info("GamesWiki migrating")
        # Migrate any old settings if needed in the future
        decky.migrate_logs(os.path.join(decky.DECKY_USER_HOME,
                                               ".config", "games-wiki", "games-wiki.log"))
        decky.migrate_settings(
            os.path.join(decky.DECKY_HOME, "settings", "games-wiki.json"),
            os.path.join(decky.DECKY_USER_HOME, ".config", "games-wiki"))
        decky.migrate_runtime(
            os.path.join(decky.DECKY_HOME, "games-wiki"),
            os.path.join(decky.DECKY_USER_HOME, ".local", "share", "games-wiki"))
