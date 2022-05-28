/**
 * @author Aleksa Marković
 */
import React, {useCallback, useContext} from 'react';
import {Link, Navigate} from 'react-router-dom';

import {feed, follow, getSuggestions, posts as getPosts} from '../../api'

import ShowPost from './ShowPost';
import {Context} from '../../shared/Context';
import InfiniteScroll from '../../shared/InfiniteScroll';
import FollowSuggestions from "../accounts/FollowSuggestions";

import {Comment, Post, User} from '../../models';

import './ViewFeed.css';


type LoadState = 'INIT' | 'LOADED' | 'ERROR' | 'SUGGESTIONS';

const ViewFeed: React.FC = () => {
    const {state: context} = useContext(Context);
    const [loadState, setLoadState] = React.useState<LoadState>('INIT');
    const [posts, setPosts] = React.useState<Post[]>([]);
    const [postsLeft, setPostsLeft] = React.useState<number>(0);
    const [lastPostIndex, setLastPostIndex] = React.useState<number>(0);
    const [suggestions, setSuggestions] = React.useState<User[]>([]);

    React.useEffect(() => {
        setLoadState('INIT');
        (async () => {
            const feedResponse = await getPosts(0, '');
            if (!feedResponse.success) {
                setLoadState('ERROR');
                return;
            }
            if (feedResponse.posts.length > 0) {
                setLoadState('LOADED');
                setPosts(feedResponse.posts);
                setPostsLeft(feedResponse.left);
                setLastPostIndex(feedResponse.posts.length);
            } else {
                const response = await getSuggestions();
                if (!response.success) {
                    setLoadState('ERROR');
                    return;
                }
                setLoadState('SUGGESTIONS');
                setSuggestions(response.suggestions);
            }
        })();
    }, []);

    // Infinite scrolling callback
    const handleInfiniteScroll = React.useCallback(async () => {
        if (loadState == 'LOADED' && postsLeft > 0) {
            const response = await getPosts(lastPostIndex, '');
            if (!response.success) {
                setLoadState('ERROR');
            } else {
                setPosts(posts.concat(response.posts));
                setLastPostIndex(lastPostIndex + response.posts.length);
            }
        }
    }, [posts, setPosts]);

    const setFollowing = useCallback(async(post: Post) => {
        if (context.loggedIn && post.poster.username !== context.currentUser) {
            const result = await follow(post.poster.username || '');
            if (result.success) {
                const postToUpdate = posts.find(p => p.id === post.id);
                if (postToUpdate) {
                    const newPosts = [...posts];
                    const postToUpdateIndex = posts.indexOf(postToUpdate);
                    newPosts[postToUpdateIndex] = {
                        ...postToUpdate,
                        poster: {
                            ...postToUpdate.poster,
                            amFollowing: !postToUpdate.poster.amFollowing
                        }
                    };
                    setPosts(newPosts);
                }
            }
        }
    }, [posts, setPosts]);
    const addComment = useCallback((post: Post, comment: string) => {
        const postToUpdate = posts.find(p => p.id === post.id);
        if (postToUpdate) {
            const newPosts = [...posts];
            const postToUpdateIndex = posts.indexOf(postToUpdate);
            newPosts[postToUpdateIndex] = {
                ...postToUpdate,
                comments: [
                    ...postToUpdate.comments,
                    {
                        id: Math.round(Math.random() * 10000),
                        text: comment,
                        likes: 0,
                        time: new Date(),
                        commenter: {
                            id: 1,
                            username: context.currentUser || 'unknown',
                            realName: context.currentUser || 'unknown',
                            profilePhotoURL: "https://picsum.photos/400",
                            amFollowing: true,
                            numberOfPosts: 0,
                            numberOfFollowers: 0,
                            numberFollowing: 0
                        },
                        haveLiked: false
                    }
                ]
            };
            setPosts(newPosts);
        }
    }, [posts, setPosts]);
    const setLiked = useCallback((post: Post) => {
        const postToUpdate = posts.find(p => p.id === post.id);
        if (postToUpdate) {
            const newPosts = [...posts];
            const postToUpdateIndex = posts.indexOf(postToUpdate);
            newPosts[postToUpdateIndex] = {
                ...postToUpdate,
                haveLiked: !postToUpdate.haveLiked
            };
            setPosts(newPosts);
        }
    }, [posts, setPosts]);
    const setCommentLiked = useCallback((post: Post, comment: Comment) => {
        const postToUpdate = posts.find(p => p.id === post.id);
        if (postToUpdate) {
            const newPosts = [...posts];
            const postToUpdateIndex = posts.indexOf(postToUpdate);
            const commentToUpdate = postToUpdate.comments.find(c => c.id === comment.id);
            if (commentToUpdate) {
                const commentToUpdateIndex = postToUpdate.comments.indexOf(commentToUpdate);
                const newComments = [...postToUpdate.comments];
                newComments[commentToUpdateIndex] = {
                    ...commentToUpdate,
                    haveLiked: !commentToUpdate.haveLiked
                };
                newPosts[postToUpdateIndex] = {
                    ...postToUpdate,
                    comments: newComments
                };
                setPosts(newPosts);
            }
        }
    }, [posts, setPosts]);
    return (
        <>
            {loadState === 'ERROR' && <p>Sorry, something went wrong...</p>}
            {context.loggedIn || <Navigate to="/accounts/login"/>}
            {loadState == 'SUGGESTIONS' &&
                <>
                    <h1>People you might like</h1>
                    {<FollowSuggestions users={suggestions}/>}
                </>
            }
            {loadState == 'LOADED' &&
                <>
                    <InfiniteScroll callback={handleInfiniteScroll}/>
                    <section className="feed-list">
                        {posts.map((post) =>
                            <ShowPost post={post} key={post.id} addComment={addComment} setFollowing={setFollowing}
                                      setLiked={setLiked} setCommentLiked={setCommentLiked}/>
                        )}
                    </section>
                </>}
        </>
    );
}

export default ViewFeed;
