import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  ToggleField,
  DropdownItem,
  SingleDropdownOption,
  staticClasses
} from "@decky/ui";
import {
  callable,
  definePlugin,
  toaster,
} from "@decky/api"
import { useState, useEffect } from "react";
import { FaWikipediaW, FaGithub, FaTwitter, FaPowerOff } from "react-icons/fa";

// Type definitions for our game data
interface Game {
  name: string;
  appid: string;
}

// Wiki site options
const wikiSites = [
  { data: "pcgamingwiki", label: "PCGamingWiki" },
  { data: "wikipedia", label: "Wikipedia" },
  { data: "fandom", label: "Fandom" },
  { data: "ign", label: "IGN" },
  { data: "metacritic", label: "Metacritic" },
  { data: "gamespot", label: "GameSpot" },
  { data: "steam", label: "Steam Store" },
  { data: "howlongtobeat", label: "HowLongToBeat" }
];

// Callable function to get installed games from the backend
const getInstalledGames = callable<[], Game[]>("get_installed_games");

function GamesWikiContent() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [pluginEnabled, setPluginEnabled] = useState<boolean>(true);
  const [defaultWikiSite, setDefaultWikiSite] = useState<string>("pcgamingwiki");
  
  // Force re-render when wiki site changes
  const [updateKey, setUpdateKey] = useState<number>(0);

  // Load games when component mounts
  useEffect(() => {
    if (pluginEnabled) {
      loadGames();
    }
  }, [pluginEnabled]);

  // Debug the wiki site changes
  useEffect(() => {
    console.log("GamesWiki: Default wiki site changed to:", defaultWikiSite);
    console.log("GamesWiki: Current wiki options:", wikiSites);
    console.log("GamesWiki: Selected option matches:", wikiSites.find(site => site.data === defaultWikiSite));
  }, [defaultWikiSite]);

  const loadGames = async () => {
    try {
      setLoading(true);
      setError("");
      const gameList = await getInstalledGames();
      console.log("GamesWiki: Loaded games:", gameList.length);
      setGames(gameList);
    } catch (err) {
      setError("Failed to load games. Please try again.");
      console.error("Error loading games:", err);
      toaster.toast({
        title: "Error",
        body: "Failed to load installed games"
      });
    } finally {
      setLoading(false);
    }
  };

  const getWikiUrl = (gameName: string, wikiType: string): string => {
    const encodedName = encodeURIComponent(gameName);
    
    switch (wikiType) {
      case "pcgamingwiki":
        return `https://www.pcgamingwiki.com/w/index.php?search=${encodedName}`;
      case "wikipedia":
        return `https://en.wikipedia.org/w/index.php?search=${encodedName}`;
      case "fandom":
        return `https://www.fandom.com/search?query=${encodedName}`;
      case "ign":
        return `https://www.ign.com/search?q=${encodedName}`;
      case "metacritic":
        return `https://www.metacritic.com/search/${encodedName}/`;
      case "gamespot":
        return `https://www.gamespot.com/search/?q=${encodedName}`;
      case "steam":
        return `https://store.steampowered.com/search/?term=${encodedName}`;
      case "howlongtobeat":
        return `https://howlongtobeat.com/search?q=${encodedName}`;
      default:
        return `https://www.pcgamingwiki.com/w/index.php?search=${encodedName}`;
    }
  };

  const openWikiLink = (gameName: string, wikiType?: string) => {
    // Use current state or passed wikiType
    const actualWikiType = wikiType || defaultWikiSite;
    const url = getWikiUrl(gameName, actualWikiType);
    const siteName = wikiSites.find(site => site.data === actualWikiType)?.label || actualWikiType;
    
    console.log("GamesWiki: Opening wiki link", { 
      gameName, 
      requestedWikiType: wikiType,
      actualWikiType, 
      currentDefault: defaultWikiSite,
      url, 
      siteName 
    });
    
    try {
      window.open(url, '_blank');
      toaster.toast({
        title: "Opening Wiki",
        body: `Searching ${siteName} for "${gameName}"`
      });
    } catch (err) {
      console.error("Error opening wiki link:", err);
      toaster.toast({
        title: "Error",
        body: "Failed to open wiki link"
      });
    }
  };

  const openSocialLink = (platform: string) => {
    const urls = {
      github: "https://github.com/KrishGaur1354",
      twitter: "https://x.com/ThatOneKrish"
    };
    
    try {
      window.open(urls[platform as keyof typeof urls], '_blank');
    } catch (err) {
      console.error("Error opening social link:", err);
    }
  };

  const handleWikiSiteChange = (option: SingleDropdownOption) => {
    console.log("GamesWiki: Wiki site changing from", defaultWikiSite, "to", option.data);
    console.log("GamesWiki: Change option object:", option);
    
    const newSite = option.data as string;
    
    // Update state
    setDefaultWikiSite(newSite);
    // Force component update
    setUpdateKey(prev => prev + 1);
    
    // Show confirmation toast
    const siteName = wikiSites.find(site => site.data === newSite)?.label || newSite;
    toaster.toast({
      title: "Wiki Site Changed",
      body: `Default wiki site set to ${siteName}`
    });
    
    console.log("GamesWiki: State updated to:", newSite);
  };

  // Get current wiki site info for display
  const currentWikiSite = wikiSites.find(site => site.data === defaultWikiSite);
  const currentWikiLabel = currentWikiSite?.label || "PCGamingWiki";

  // If plugin is disabled, show minimal UI
  if (!pluginEnabled) {
    return (
      <div style={{ padding: "16px" }}>
        <PanelSection>
          <PanelSectionRow>
            <ToggleField
              label="Enable GamesWiki"
              description="Toggle to enable/disable the plugin"
              checked={pluginEnabled}
              onChange={setPluginEnabled}
              icon={<FaPowerOff />}
            />
          </PanelSectionRow>
        </PanelSection>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: "6px",
      maxHeight: "70vh",
      overflowY: "auto"
    }} key={updateKey}>
      {/* Plugin Toggle */}
      <PanelSection>
        <PanelSectionRow>
          <ToggleField
            label="GamesWiki Enabled"
            description="Toggle to enable/disable the plugin"
            checked={pluginEnabled}
            onChange={setPluginEnabled}
            icon={<FaPowerOff />}
          />
        </PanelSectionRow>
      </PanelSection>

      {/* Default Wiki Site Selection */}
      <PanelSection title="Settings">
        <PanelSectionRow>
          <div style={{ marginBottom: "4px", fontSize: "12px", color: "#dcdedf" }}>
            Current default: {currentWikiLabel}
          </div>
          <DropdownItem
            label="Default Wiki Site"
            description="Choose your preferred wiki site"
            rgOptions={wikiSites}
            selectedOption={defaultWikiSite}
            onChange={handleWikiSiteChange}
            strDefaultLabel="Select Wiki Site"
          />
        </PanelSectionRow>
      </PanelSection>

      {/* Installed Games Section */}
      <PanelSection title="Your Installed Games">
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={loadGames}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh Games"}
          </ButtonItem>
        </PanelSectionRow>

        {error && (
          <PanelSectionRow>
            <div style={{ 
              color: "#ff6b6b", 
              fontSize: "11px",
              padding: "6px",
              backgroundColor: "rgba(255, 107, 107, 0.1)",
              borderRadius: "4px",
              border: "1px solid rgba(255, 107, 107, 0.3)"
            }}>
              {error}
            </div>
          </PanelSectionRow>
        )}

        {loading ? (
          <PanelSectionRow>
            <div style={{ 
              textAlign: "center", 
              padding: "16px",
              color: "#888",
              fontSize: "12px"
            }}>
              Loading your games...
            </div>
          </PanelSectionRow>
        ) : games.length === 0 ? (
          <PanelSectionRow>
            <div style={{ 
              textAlign: "center", 
              padding: "16px", 
              color: "#888",
              backgroundColor: "rgba(136, 136, 136, 0.1)",
              borderRadius: "4px",
              fontSize: "12px"
            }}>
              No games found
            </div>
          </PanelSectionRow>
        ) : (
          <>
            {games.slice(0, 15).map((game) => (
              <PanelSectionRow key={game.appid}>
                <div style={{ width: "100%", marginBottom: "2px" }}>
                  <div style={{ 
                    fontWeight: "500", 
                    marginBottom: "4px",
                    fontSize: "12px",
                    color: "#dcdedf",
                    wordWrap: "break-word",
                    lineHeight: "1.1"
                  }}>
                    {game.name}
                  </div>
                  <ButtonItem
                    layout="below"
                    onClick={() => {
                      console.log("GamesWiki: Button clicked, using wiki site:", defaultWikiSite);
                      openWikiLink(game.name, defaultWikiSite);
                    }}
                  >
                    Open in {currentWikiLabel}
                  </ButtonItem>
                </div>
              </PanelSectionRow>
            ))}
            
            {games.length > 15 && (
              <PanelSectionRow>
                <div style={{ 
                  textAlign: "center", 
                  fontSize: "10px", 
                  color: "#888",
                  padding: "6px",
                  fontStyle: "italic"
                }}>
                  Showing first 15 of {games.length} games
                </div>
              </PanelSectionRow>
            )}
            
            <PanelSectionRow>
              <div style={{ 
                textAlign: "center", 
                fontSize: "10px", 
                color: "#888",
                padding: "4px"
              }}>
                Total: {games.length} games
              </div>
            </PanelSectionRow>
          </>
        )}
      </PanelSection>

      {/* Social Links Section */}
      <PanelSection title="Developer">
        <PanelSectionRow>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr", 
            gap: "6px",
            width: "100%"
          }}>
            <ButtonItem
              layout="below"
              onClick={() => openSocialLink("github")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
                <FaGithub />
                GitHub
              </div>
            </ButtonItem>
            <ButtonItem
              layout="below"
              onClick={() => openSocialLink("twitter")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
                <FaTwitter />
                Twitter
              </div>
            </ButtonItem>
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={{ 
            textAlign: "center", 
            fontSize: "9px", 
            color: "#888",
            padding: "3px",
            fontStyle: "italic"
          }}>
            Made with love by ThatOneKrish
          </div>
        </PanelSectionRow>
      </PanelSection>
    </div>
  );
}

export default definePlugin(() => {
  console.log("GamesWiki plugin initializing")

  return {
    // The name shown in various decky menus
    name: "GamesWiki",
    // The element displayed at the top of your plugin's menu
    titleView: <div className={staticClasses.Title}>GamesWiki</div>,
    // The content of your plugin's menu
    content: <GamesWikiContent />,
    // The icon displayed in the plugin list
    icon: <FaWikipediaW />,
    // The function triggered when your plugin unloads
    onDismount() {
      console.log("GamesWiki unloading")
    },
  };
});
