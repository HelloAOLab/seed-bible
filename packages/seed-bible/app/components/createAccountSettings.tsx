import { getStyleOf } from 'app.styles.styler';
import { MenuIcon, AiIcon, T, MenuDown, FormatLine, ColorSelect, ToolbarIcon, Panal, Playlist, AiChatIcon } from 'app.components.icons';
import { useSideBarContext } from 'app.hooks.sideBar';
const { useState, useEffect } = os.appHooks
// await os.eraseData(tags.key, authBot.id)
const CreateAccountSettings = () => {
    const { sidebarMode, setSideBarMode } = useSideBarContext();
    const [img, setImg] = useState();
    const [profileName, setProfileName] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [uid, setUid] = useState(authBot?.id);
    // const [location ,setLocation] = useState()
    async function getLocation() {
        const location = await os.getGeolocation();

        if (location.success) {
            const address = await os.convertGeolocationToWhat3Words(location);
            os.log(address, 'address');
            setLocation(address)
        } else {
            os.tost("Could not get geolocation");
        }
    }
    async function init() {
        getLocation()
        await os.requestAuthBot()
        if (!authBot.id)
            return
        const data = await os.getData(tags.key, authBot.id);
        if (data.success) {
            const payload = data.data
            setImg(payload.photoLink)
            setProfileName(payload.profileName)
            setDescription(payload.description)
            setLocation(payload.location)
            setUid(payload.uid)
            // os.log(data, 'the data d')
        }
    }
    useEffect(() => {
        init()
    }, [])
    async function uploadImage() {
        const files = await os.showUploadFiles()
        if (files.length === 0) {
            os.toast('no file uploaded')
            return
        }
        const file = files[0];
        const result = await os.recordFile(tags.key, file);

        if (result.success) {
            tags.uploadUrl = result.url;
            const data = await os.getData(tags.key, authBot.id);
            if (data.success) {
                await os.recordData(tags.key, authBot.id, {
                    photoLink: result.url,
                    ...data.data
                });
                setImg(result.url)
            } else {
                await os.recordData(tags.key, authBot.id, {
                    photoLink: result.url,
                });
                setImg(result.url)
            }
            // os.toast("Success! Uploaded to " + result.url);
        } else {
            os.log(result)
            const img = result.existingFileUrl
            await os.recordData(tags.key, authBot.id, {
                photoLink: img,
            });
            setImg(result.existingFileUrl)
            // os.toast("Failed " + result.errorMessage);
        }

    }
    async function saveProfileData() {
        const authBot = await os.requestAuthBot();
        if (authBot) {
            os.toast("Logged in!");
        } else {
            os.toast("Not logged in.");
            return
        }
        const payload = {
            profileName,
            description,
            location,
            uid,
        };
        const data = await os.getData(tags.key, authBot.id);
        if (data.success) {
            const result = await os.recordData(tags.key, authBot.id, { ...data.data, ...payload });

            if (result?.success) {
                setSideBarMode('settings')
                os.toast("Profile saved successfully!");
            } else {
                os.toast("Error saving profile: " + result?.errorMessage);
            }
        }
    }

    return <div className="createAccount-settings">
        <div>
            <div className="routerOptions">
                <div style={{ cursor: 'pointer' }} onClick={() => {
                    if (globalThis.AccountSettingsEnteredFrom === 'settings') {

                        setSideBarMode('settings');
                        setTimeout(() => globalThis.SetActiveSettingsTab('general'), 0)
                    }
                    else if (globalThis.AccountSettingsEnteredFrom === 'default') {

                        setSideBarMode('default')
                    }
                }}
                    className="blackText">
                    <MenuIcon name="arrow_back" />
                </div>
                <div className="softText">Create new profile</div>
            </div>
        </div>
        <div style={{ 'margin-top': '-10px' }} className="routerTitle blackText">
            <div>Create profile</div>
        </div>

        <div className="mediumText">Add a new profile to your account</div>
        <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center', width: '100%', gap: '25px' }}>
            <img style={{ 'border-radius': '50%', height: '50px', width: '50px', border: '1px solid #4459F3' }} src={img} />
            <button onClick={() => uploadImage()} style={{ background: '#4459F31A', border: '1px solid #4459F3', width: '100px', height: '30px', color: '#4459F3' }}>Add picture</button>
        </div>
        <div style={{ height: '20px' }}></div>
        <div className="blackText">Profile name</div>
        <div style={{ height: '10px' }}></div>
        <input
            style={{ height: '25px' }}
            placeholder="e.g Craig family"
            className="selectInput"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
        />
        <p style={{ 'font-size': '10px', color: '#5F5E5C' }}>You can change this later</p>
        <div style={{ height: '20px' }}></div>
        <div className="blackText">Description <span style={{ 'font-size': '10px', color: '#5F5E5C' }}>(Optional)</span></div>
        <div style={{ height: '10px' }}></div>
        <textarea
            style={{ height: '50px' }}
            placeholder="Enter your profile description..."
            className="selectInput"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
        ></textarea>
        <div style={{ height: '20px' }}></div>
        <div className="blackText">Location <span style={{ 'font-size': '10px', color: '#5F5E5C' }}>(Optional)</span></div>
        <div style={{ height: '10px' }}></div>
        <input
            style={{ height: '25px' }}
            placeholder="e.g Austin,TX"
            className="selectInput"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
        />
        <div style={{ height: '20px' }}></div>
        <div className="blackText">Your UID will be:</div>
        <div style={{ height: '10px' }}></div>
        <input
            style={{ height: '25px' }}
            value={uid}
            className="selectInput"
            readOnly
        />
        <div style={{ height: '20px' }}></div>
        <button onClick={saveProfileData} style={{ background: '#4459F3', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>
            Save Profile
        </button>
        <style>{getStyleOf('createAccountSettings.css')}</style>
    </div>
}

export { CreateAccountSettings }