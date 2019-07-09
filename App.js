import React, { Component } from 'react';
import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    RTCView,
    MediaStream,
    MediaStreamTrack,
    mediaDevices
} from 'react-native-webrtc';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    Button,
    Alert
} from 'react-native';

class App extends Component {
    // Initial state
    constructor(props) {
    super(props);
    this.state = { 
      username: '',
      connection: null,
      ws: new WebSocket('ws://192.168.0.28:3001'),
      otherUsername: null,
      login:false,
      channel: null,
      jsonName: '',
      countMsg: 0,
    };
  }

  componentWillMount() {
    const { ws } = this.state
    console.log('ws', ws)
    
    ws.onopen = () => {
      console.log('Connected to the signaling server')
    }

    ws.onerror = err => {
      console.error('ws.onerror', err)
    }

    ws.onmessage = msg => {
      console.log('Got message', msg.data)

      const data = JSON.parse(msg.data)

      switch (data.type) {
        case 'login':
          this.handleLogin(data.success)
          break
        case 'offer':
          this.handleOffer(data.offer, data.username)
          break
        case 'answer':
          this.handleAnswer(data.answer)
          break
        case 'candidate':
          this.handleCandidate(data.candidate)
          break
        case 'close':
          this.handleClose()
          break
        default:
          break
      }
    }
  }

  sendMessage = message => {
    const { ws, otherUsername } = this.state

    if (otherUsername) {
      message.otherUsername = otherUsername
    }

    ws.send(JSON.stringify(message))
  }

  login = () => {
    const { username } = this.state
    if (username !== '') {
      this.sendMessage({
        type: 'login',
        username
      })
    }
  }

  handleLogin = async success => {
    if (success === false) {
      Alert.alert('error','😞 Username already taken')
    } else {

      const configuration = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};
      const connection = new RTCPeerConnection(configuration, { optional: [{ RtpDataChannels: true}] });
      this.setState({ connection, login: success })
      
      const channel = connection.createDataChannel('RtpDataChannels')
                this.setState({ channel })

      connection.ondatachannel = event => {
        event.channel.onmessage = event => {
          const { countMsg } = this.state
          this.setState({ countMsg: countMsg + 1})
          // console.log('event.channel.onmessage', event.data);
        };

        event.channel.onopen = event => {
          console.log('event.channel.onopen', event)
            // channel.send('RTCDataChannel opened.', event);
        };
        
        event.channel.onclose = event => {
            console.log('RTCDataChannel closed.', event);
        };
        
        event.channel.onerror = event => {
            console.error('event.channel.onerror', event);
        };
      }

        connection.onicecandidate = (event) => {
            if (event.candidate) {
            this.sendMessage({
              type: 'candidate',
              candidate: event.candidate
            })
          }
        };
      }
  }
  
  callOtherUser = () => {
    const { connection } = this.state
    connection.createOffer().then(
    offer => {
      this.sendMessage({
        type: 'offer',
        offer: offer
      })
      connection.setLocalDescription(offer)
    });
  }

  handleOffer = (offer, username) => {
    const { connection } = this.state
    this.setState({ otherUsername: username })
    connection.setRemoteDescription(new RTCSessionDescription(offer))
    connection.createAnswer().then(
      answer => {
        connection.setLocalDescription(answer)
        this.sendMessage({
          type: 'answer',
          answer: answer
        })
      },
      error => {
        alert('Error when creating an answer')
        console.error('createAnswer error', error)
      }
    )
  }

  handleAnswer = answer => {
    const { connection } = this.state
    connection.setRemoteDescription(new RTCSessionDescription(answer))
  }

  handleCandidate = candidate => {
    const { connection } = this.state
    connection.addIceCandidate(new RTCIceCandidate(candidate))
  }

  handleClose = () => {
    const { connection } = this.state
    this.setState({ otherUsername: null })
    connection.close()
    connection.onicecandidate = null
    connection.onaddstream = null
  }

  getJson = () => {
    const { jsonName, channel } = this.state
    channel.send(jsonName)
  }

  render() {
    const { login, countMsg } = this.state
    return (
      <View style={styles.container}>
        { !login ?
          (
            <View>
              <Text style={styles.welcome}>enter name</Text>
              <TextInput
                style={{height: 40, width: 150, borderColor: 'gray', borderWidth: 1}}
                onChangeText={username => this.setState({username})}
                value={this.state.username}
              />
              <Button
                onPress={this.login}
                title="login"
                color="#841584"
              />
            </View>
          ) : (
            <View>
              <Text style={styles.welcome}>connect with peer!</Text>
              <TextInput
                style={{height: 40, width: 250, borderColor: 'gray', borderWidth: 1}}
                onChangeText={otherUsername => this.setState({otherUsername})}
                value={this.state.otherUsername}
              />
              <Button
                onPress={this.callOtherUser}
                title="Call other user"
                color="#841584"
              /> 
              <Text style={styles.welcome}>json name</Text>
              <Text style={styles.welcome}>{countMsg}</Text>
              {/* <TextInput
                style={{height: 40, width: 250, borderColor: 'gray', borderWidth: 1}}
                onChangeText={jsonName => this.setState({jsonName})}
                value={this.state.jsonName}
              />
              <Button
                onPress={this.getJson}
                title="get json"
                color="#841584"
              />  */}
              <Button
                onPress={this.handleClose}
                title="Close connection"
                color="#841584"
              /> 
            </View>
          )
        }
        <Text style={styles.welcome}>{this.state.messageR}</Text>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  containerVideo: {
        flex: 1,
        backgroundColor: '#ccc',
        borderWidth: 1,
        borderColor: '#000'
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

export default App;
